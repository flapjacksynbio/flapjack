from django.db.models import Q
from registry.models import *
from django_pandas.io import read_frame
import pandas as pd
import numpy as np
import time


def accessible_samples(user):
    """Samples a user may read: own, public, or shared with them.

    Same predicate the REST viewsets use, kept here so the websocket paths
    cannot drift from it. No user matches nothing.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return Sample.objects.none()
    return Sample.objects.filter(
        Q(assay__study__owner=user) |
        Q(assay__study__public=True) |
        Q(assay__study__shared_with=user)
    )


def writable_samples(user):
    """Samples a user may write to. Only their own: public and shared are
    readable but not writable."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return Sample.objects.none()
    return Sample.objects.filter(assay__study__owner=user)

field_names = [
    'signal__id',
    'signal__name',
    'signal__color',
    'value',
    'time',
    'sample__id',
    'sample__assay__name',
    'sample__assay__study__name',
    'sample__media__name',
    # sample__strain__name is deliberately absent: strain is many-to-many, so
    # querying it here would emit one row per (measurement, strain) pair and
    # double-count consortium samples. get_measurements attaches Strain instead.
    'sample__vector__name',
    'sample__supplements__name',
    'sample__supplements__chemical__name',
    'sample__supplements__chemical__id',
    'sample__supplements__concentration',
    'sample__row', 
    'sample__col'
]

pretty_field_names = {
    'signal__id': 'Signal_id',
    'signal__name': 'Signal',
    'signal__color': 'Color',
    'value': 'Measurement',
    'time': 'Time',
    'sample__id': 'Sample',
    'sample__assay__name': 'Assay',
    'sample__assay__study__name': 'Study',
    'sample__media__name': 'Media',
    'sample__vector__name': 'Vector',
    'sample__supplements__name': 'Supplement',
    'sample__supplements__chemical__name': 'Chemical',
    'sample__supplements__chemical__id': 'Chemical_id',
    'sample__supplements__concentration': 'Concentration',
    'sample__row': 'Row', 
    'sample__col': 'Column'
}

def get_samples(filter, user=None):
    """Resolve a client-supplied filter to samples the user may read.

    user defaults to None, which matches nothing, so forgetting to pass one
    returns an empty queryset rather than the whole table.
    """
    print('get_samples', flush=True)
    start = time.time()
    studies = filter.get('study')
    assays = filter.get('assay')
    vectors = filter.get('vector')
    meds = filter.get('media')
    strains = filter.get('strain')
    samples = filter.get('sample')

    s = accessible_samples(user)
    filter_exist = False

    if studies:
        s = s.filter(assay__study__id__in=studies)
        filter_exist = True    
    if assays:
        s = s.filter(assay__id__in=assays)
        filter_exist = True    
    if vectors:
        s = s.filter(vector__id__in=vectors)
        filter_exist = True    
    if meds:
        s = s.filter(media__id__in=meds)  
        filter_exist = True    
    if strains:
        s = s.filter(strain__id__in=strains)
        filter_exist = True    
    if samples:
        s = s.filter(id__in=samples)
        filter_exist = True

    if not filter_exist:
        s = Sample.objects.none()


    end = time.time()
    print('get_samples took %f seconds'%(end-start), flush=True)
    # distinct() because filtering on the strain M2M joins the through table
    # and would otherwise return a sample once per matching strain.
    return s.distinct()

# Get dataframe of measurement values for a set of samples in a query
# -----------------------------------------------------------------------------------
def get_measurements(samples, signals=None):
    # Get measurements for a given samples
    print('get_measurements', flush=True)
    start = time.time()
    samp_ids = [samp.id for samp in samples]
    meas = Measurement.objects.filter(sample__id__in=samp_ids)
    # Filter by signal
    if signals:
        meas = meas.filter(signal__id__in=signals)

    # Get pandas dataframe
    df_all = read_frame(meas, fieldnames=field_names)
    df_all.columns = [pretty_field_names[col] for col in df_all.columns]

    # Attach Strain per sample instead of via read_frame, which would emit one
    # row per (measurement, strain) pair. Consortium names are joined with '+',
    # matching vector naming, so grouping by Strain keeps a consortium together.
    strain_names = {}
    for samp in Sample.objects.filter(id__in=samp_ids).prefetch_related('strain'):
        names = sorted(st.name for st in samp.strain.all())
        strain_names[samp.id] = '+'.join(names) if names else None
    df_all['Strain'] = df_all['Sample'].map(strain_names)

    results = []
    for samp_id,df in df_all.groupby('Sample'):
        # Merge to get one column per chemical for the relevant columns
        # Columns of interest
        on = list(df.columns)
        on.remove('Chemical')
        on.remove('Chemical_id')
        on.remove('Supplement')
        on.remove('Concentration')

        chemicals = df.Chemical.unique()
        # If no chemicals we are done...
        if len(chemicals)==0:
            end = time.time()
            print('No chemicals found, get_measurements took ', end-start, flush=True)
            results.append(df)
        else:
            # Do recursive join over all chemicals
            if chemicals[0]:
                merge = df[df.Chemical==chemicals[0]]
            else:
                merge = df[pd.isnull(df.Chemical)]
            
            for i in range(1, len(chemicals)):
                chemical = chemicals[i]
                if chemical:
                    to_merge = df[df.Chemical==chemical]
                    merge = merge.merge(to_merge, on=on, suffixes=['', str(i+1)])
                
            # Original supplement becomes Supplement1 etc.
            merge = merge.rename(columns={
                'Supplement': 'Supplement1',
                'Concentration': 'Concentration1',
                'Chemical': 'Chemical1',
                'Chemical_id': 'Chemical_id1',
            })

            # Create a new Supplement and Chemical column combining the individual names
            merge['Supplement'] = merge.Supplement1
            merge['Chemical'] = merge.Chemical1
            for i in range(1, len(chemicals)):
                if chemicals[i]:
                    merge['Supplement'] += ' + ' + merge[f'Supplement{i+1}']
                    merge['Chemical'] += ' + ' + merge[f'Chemical{i+1}']

            # Merge chemical ids into lists    
            # Only chemicals that actually merged have a suffixed column.
            id_cols = [f'Chemical_id{c+1}' for c in range(len(chemicals))
                       if f'Chemical_id{c+1}' in merge.columns]
            merge['Chemical_id'] = merge[id_cols].values.tolist() if id_cols else [[]] * len(merge)

            if len(merge) == 0:
                print('get_measurements: no measurements after chemical merge', flush=True)
            results.append(merge)
    
    end = time.time()
    print('get_measurements took ', end-start, flush=True)
    if len(results) > 0:
        return pd.concat(results, ignore_index=True)
    else:
        return pd.DataFrame()

def get_biomass(df, biomass_signal):
    samp_ids = df.Sample.unique()
    s = Sample.objects.all()
    s = s.filter(id__in=samp_ids)
    biomass_df = get_measurements(s, signals=[biomass_signal])
    return biomass_df

class NotWritable(Exception):
    """The requesting user may not write to the requested sample."""


def upload_measurements(df, sample, signal, user=None):
    """Append measurements to a sample the user owns.

    user defaults to None, which owns nothing, so omitting it writes nothing.
    """
    # df contains Time and Measurement for the given sample
    measurements = []
    sig = Signal.objects.get(id=signal[0])
    try:
        samp = writable_samples(user).get(id=sample[0])
    except Sample.DoesNotExist:
        # Same message either way, so it cannot be used to probe for sample ids.
        raise NotWritable('Sample not found or not writable by this user.')
    measurements = [
        Measurement(
            sample=samp, 
            signal=sig, 
            value=row.Measurement, 
            time=row.Time
            ) for idx,row in df.iterrows()
        ]
    if len(measurements)==0:
        return False
    Measurement.objects.bulk_create(measurements)
    return True
