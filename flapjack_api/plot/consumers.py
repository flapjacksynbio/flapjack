# Built in imports.
import json
import asyncio
import logging
import uuid
# Third Party imports.
from channels.db import database_sync_to_async
from channels.exceptions import DenyConnection
from channels.generic.websocket import AsyncWebsocketConsumer
from . import plotting
from analysis.analysis import Analysis 
from analysis.contracts import AnalysisError, normalize_analysis_params, validate_dataframe
from analysis.util import *
from registry.util import get_samples, get_measurements
from registry.models import Signal, Chemical
from plotly.subplots import make_subplots
import plotly
import pandas as pd
import time
import math

logger = logging.getLogger(__name__)

# 'Vector' and 'Strain' are kept as aliases so pyFlapjack keeps working.
group_fields = {
    'Vector': 'Vector',
    'Plasmid': 'Vector',
    'Strain': 'Strain',
    'Chassis': 'Strain',
    'Study': 'Study',
    'Signal': 'Signal',
    'Assay': 'Assay',
    'Media': 'Media',
    'Supplement': 'Supplement',
}

@database_sync_to_async
def fetch_measurements(params, signals, user):
    """Resolve the sample query and load its measurements.

    Runs in a worker thread so the sync ORM is not called from the event loop.
    Scoped to studies the user may read. Returns None when nothing matches.
    """
    s = get_samples(params, user)
    if s.count() == 0:
        return None
    return get_measurements(s, signals)


@database_sync_to_async
def get_chemical_name(chemical_id):
    try:
        return Chemical.objects.get(id=chemical_id).name
    except Chemical.DoesNotExist:
        return None


@database_sync_to_async
def analyze_sample(analysis, group):
    """Analysis reaches the database for biomass and background, so it cannot
    run on the event loop."""
    return analysis.analyze_data(group)


class PlotConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        await self.accept()
        await self.channel_layer.group_add(
            "asd",
            self.channel_name
        )

    async def plot(self, df, 
                    mean=False, 
                    std=False, 
                    normalize=False, 
                    groupby1=None, 
                    groupby2=None,
                    font_size=10,
                    xlabel='Time',
                    ylabel='Measurement',
                    xcolumn='Time',
                    ycolumn='Measurement',
                    plot_type='timeseries'):
        '''
            Generate plot data for frontend plotly plot generation
        '''
        n_measurements = len(df)
        if n_measurements == 0:
            return None

        traces = []
        colors = {}
        colidx = 0
        subplot_index = 0
        try:
            groupby1 = group_fields[groupby1]
            groupby2 = group_fields[groupby2]
        except KeyError as e:
            raise ValueError(
                f'Unknown group-by field {e.args[0]!r}. '
                f'Valid values: {", ".join(sorted(group_fields))}.'
            )
        grouped = df.groupby(groupby1)     
        n_subplots = len(grouped)
        ncolors = len(plotting.palette)
        progress = 0

        # Compute number of rows and columns
        n_sub_plots = len(grouped)
        rows,cols = plotting.optimal_grid(n_sub_plots)
        
        # Construct subplots
        start = time.time()
        fig = make_subplots(
                            rows=rows, cols=cols,
                            subplot_titles=[name for name,g in grouped],
                            shared_xaxes=True, shared_yaxes=False,
                            vertical_spacing=0.1, horizontal_spacing=0.1
                            ) 
        end = time.time()

        # Add traces to subplots
        print('make_subplots took %g'%(end-start), flush=True)
        for name1,g1 in grouped:
            for name2,g2 in g1.groupby(groupby2):
                # Choose color and whether to show in legend
                if name2 not in colors:
                    colors[name2] = plotting.palette[colidx%ncolors]
                    colidx += 1
                    show_legend_group = True
                else:
                    show_legend_group = False

                # Which position the subplot is in
                row = 1 + subplot_index//cols
                col = 1 + subplot_index%cols
            
                # Decide color for line, use signal color if appropriate
                color = colors[name2]
                if groupby2=='Signal':
                    color_string = g2['Color'].values[0]
                    try:
                        color_int = int(color_string[1:], 16)
                        color = color_string
                    except:
                        if color_string in plotting.plotly_colors:
                            color = color_string

                # Add traces to figure
                if plot_type == 'timeseries':
                    fig = plotting.make_timeseries_traces(
                            fig,
                            g2,
                            color=color, 
                            mean=mean, 
                            std=std, 
                            normalize=normalize,
                            show_legend_group=show_legend_group,
                            group_name=str(name2),
                            row=row, col=col,
                            ycolumn=ycolumn
                        )
                elif plot_type == 'bar':
                    fig = plotting.make_bar_traces(
                            fig,
                            g2,
                            color=color, 
                            mean=mean, 
                            std=std, 
                            normalize=normalize,
                            show_legend_group=show_legend_group,
                            group_name=str(name2),
                            row=row, col=col,
                            xcolumn=groupby2,
                            ycolumn=ycolumn
                        )
                elif plot_type == 'induction':
                    fig = plotting.make_induction_traces(
                            fig,
                            g2,
                            color=color, 
                            mean=mean, 
                            std=std, 
                            normalize=normalize,
                            show_legend_group=show_legend_group,
                            group_name=str(name2),
                            row=row, col=col,
                            ycolumn=ycolumn
                        )
                elif plot_type == 'heatmap':
                    fig = plotting.make_heatmap_traces(
                            fig,
                            g2, 
                            mean=mean, 
                            std=std, 
                            normalize=normalize,
                            show_legend_group=show_legend_group,
                            group_name=str(name2),
                            row=row, col=col,
                            ycolumn=ycolumn
                        )
                elif plot_type == 'kymograph':
                    fig = plotting.make_kymograph_traces(
                            fig,
                            g2, 
                            mean=mean, 
                            std=std, 
                            normalize=normalize,
                            show_legend_group=show_legend_group,
                            group_name=str(name2),
                            row=row, col=col,
                            ycolumn=ycolumn
                        )
                else:
                    print('Unsupported plot type, ', plot_type, flush=True)
                
                # Format axes
                plotting.format_axes(fig, 
                                        row, col, rows, 
                                        xlabel=xlabel, 
                                        ylabel=ylabel, 
                                        font_size=font_size)

                # Update progress bar
                progress += len(g2)
                await self.send(text_data=json.dumps({
                    'type': 'progress_update',
                    'data': {'progress': int(50 + 50 * progress / n_measurements)}
                }))
                await asyncio.sleep(0)
            # Next subplot
            subplot_index += 1
        if plot_type=='kymograph' or plot_type=='induction':
            xaxis_type, yaxis_type = 'log', None
        elif plot_type=='heatmap':
            xaxis_type, yaxis_type = 'log', 'log'
        else:
            xaxis_type, yaxis_type = None, None
        plotting.layout_screen(fig, xaxis_type=xaxis_type, yaxis_type=yaxis_type, font_size=font_size)
        return fig

    async def run_analysis(self, df, analysis):
        if len(df)==0:
            return df, []
        grouped = df.groupby('Sample')
        result_dfs = []
        warnings = []
        n_samples = len(grouped)
        progress = 0
        for id,g in grouped:
            result_df = await analyze_sample(analysis, g)
            if result_df is not None and len(result_df):
                result_dfs.append(result_df)
            warnings.extend(analysis.pop_warnings())
            progress += 1
            await self.send(text_data=json.dumps({
                'type': 'progress_update',
                'data': {'progress': int(50 * progress / n_samples)}
            }))
            await asyncio.sleep(0)
        if not result_dfs:
            raise AnalysisError(
                'NO_VALID_RESULTS',
                'No selected samples contained enough valid data to produce this analysis.',
                stage='analysis',
                analysis=analysis.analysis_type,
                warnings=warnings,
            )
        return pd.concat(result_dfs), warnings

    async def generate_data(self, event):
        params = event['params']
        plot_options = params.get('plotOptions')
        if not isinstance(plot_options, dict):
            raise AnalysisError(
                'MISSING_PLOT_OPTIONS', 'Plot options are required.', field='plotOptions'
            )
        missing_plot_option = next(
            (field for field in ('normalize', 'subplots', 'markers', 'plot')
             if field not in plot_options),
            None,
        )
        if missing_plot_option:
            raise AnalysisError(
                'MISSING_PLOT_PARAMETER',
                f'Plot option {missing_plot_option!r} is required.',
                field=missing_plot_option,
            )
        signals = params.get('signal')
        warnings = []
        analysis_params = params.get('analysis')
        if analysis_params:
            analysis_params = normalize_analysis_params(analysis_params, signals)
            params = dict(params, analysis=analysis_params)
        df = await fetch_measurements(params, signals, self.user)
        validate_dataframe(df, analysis_params.get('type') if analysis_params else None)
        if df is not None:
            # Default axis labels for raw measurements
            xlabel, ylabel = 'Time (h)', 'Measurement (AU)'
            xcolumn, ycolumn = 'Time', 'Measurement'

            # Default plot type for raw measurements
            plot_type = 'timeseries'

            # Run analysis if selected
            if analysis_params:
                # What analysis to run
                analysis_type = analysis_params['type']

                # Set up the properties of the plot
                xlabel, ylabel = plotting.plot_properties[analysis_type]['axis_labels']
                plot_type = plotting.plot_properties[analysis_type]['plot_type']
                
                # Is this a kymograph or induction curve or other nested analysis?
                analysis_function = analysis_params.get('function')
                if analysis_function:
                    # If so, use the data column for that analysis
                    ycolumn = plotting.plot_properties[analysis_function]['data_column']
                    # Analysis does not specify ylabel, use that from analysis function
                    if not ylabel:
                        _,ylabel = plotting.plot_properties[analysis_function]['axis_labels']
                else:
                    # Otherwise use the top level analysis type's data column
                    ycolumn = plotting.plot_properties[analysis_type]['data_column']

                # Analyze the data
                analysis = Analysis(analysis_params, signals)
                df, warnings = await self.run_analysis(df, analysis)

            # Normalize the data if required
            normalize = plot_options['normalize']
            if normalize and normalize!='None':
                print('normalizing', flush=True)
                print('normalize', normalize, flush=True)
                try:
                    df = normalize_data(df, normalize, ycolumn)
                except (KeyError, ValueError, FloatingPointError) as exc:
                    raise AnalysisError(
                        'NORMALIZATION_FAILED', str(exc), stage='normalization',
                        analysis=analysis_params.get('type') if analysis_params else None,
                    )
                if df is None or len(df) == 0 or ycolumn not in df:
                    raise AnalysisError(
                        'NORMALIZATION_FAILED',
                        f'Normalization {normalize!r} produced no usable values.',
                        stage='normalization',
                        analysis=analysis_params.get('type') if analysis_params else None,
                    )

            # Correct axis labels for heatmap and kymograph
            if plot_type == 'heatmap':
                chemical1 = await get_chemical_name(analysis.chemical_id1)
                chemical2 = await get_chemical_name(analysis.chemical_id2)
                if not chemical1 or not chemical2:
                    raise AnalysisError(
                        'MISSING_ANALYTE', 'A selected heatmap analyte no longer exists.',
                        stage='data_validation', analysis=analysis.analysis_type,
                        field='analyte1' if not chemical1 else 'analyte2',
                    )
                xlabel = 'Concentration ' + chemical1 + ' (M)'
                ylabel = 'Concentration ' + chemical2 + ' (M)'
            elif plot_type == 'kymograph':
                chemical = await get_chemical_name(analysis.chemical_id)
                if not chemical:
                    raise AnalysisError(
                        'MISSING_ANALYTE', 'The selected analyte no longer exists.',
                        stage='data_validation', analysis=analysis.analysis_type,
                        field='analyte',
                    )
                xlabel = 'Concentration ' + chemical + ' (M)'
            elif plot_type == 'induction':
                chemical = await get_chemical_name(analysis.chemical_id)
                if not chemical:
                    raise AnalysisError(
                        'MISSING_ANALYTE', 'The selected analyte no longer exists.',
                        stage='data_validation', analysis=analysis.analysis_type,
                        field='analyte',
                    )
                xlabel = 'Concentration ' + chemical + ' (M)'

            # Plot figure
            subplots = plot_options['subplots']
            markers = plot_options['markers']
            normalize = plot_options['normalize']
            mean = 'Mean' in plot_options['plot']
            std = 'std' in plot_options['plot']
            try:
                fig = await self.plot(df,
                                    groupby1=subplots,
                                    groupby2=markers,
                                    mean=mean, std=std,
                                    xlabel=xlabel, ylabel=ylabel,
                                    xcolumn=xcolumn, ycolumn=ycolumn,
                                    plot_type=plot_type,
                                    normalize=normalize
                                    )
            except (KeyError, ValueError, TypeError) as exc:
                raise AnalysisError(
                    'PLOTTING_FAILED', str(exc), stage='plotting',
                    analysis=analysis_params.get('type') if analysis_params else None,
                )
            if fig:
                fig_json = fig.to_json()
            else:
                fig_json = ''
        # Send back traces to plot
        await self.send(text_data=json.dumps({
            'type': 'plot_data',
            'data': {
                'figure': fig_json,
                'warnings': warnings,
            }
        }))

    async def send_analysis_error(self, error, error_id):
        payload = dict(error.data)
        payload['error_id'] = error_id
        await self.send(text_data=json.dumps({'type': 'analysis_error', 'data': payload}))
        
    async def receive(self, text_data):
        error_id = str(uuid.uuid4())
        try:
            data = json.loads(text_data)
            if data.get('type') != 'plot':
                raise AnalysisError(
                    'INVALID_REQUEST_TYPE', 'Expected a plot request.', field='type'
                )
            await self.generate_data({'params': data.get('parameters', {})})
        except AnalysisError as exc:
            await self.send_analysis_error(exc, error_id)
        except Exception:
            logger.exception('Unexpected plot request failure error_id=%s request=%r', error_id, text_data)
            await self.send_analysis_error(AnalysisError(
                'UNEXPECTED_SERVER_ERROR',
                'The server could not complete this request. Please report the error identifier.',
                stage='server',
            ), error_id)

    async def disconnect(self, message):
        await self.channel_layer.group_discard(
            "asd",
            self.channel_name
        )
