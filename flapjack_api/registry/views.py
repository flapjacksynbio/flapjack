from django.db.models import Q
from django.contrib.auth.models import User
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_filters import FilterSet, CharFilter, NumberFilter, RelatedFilter, BooleanFilter
from rest_framework_filters.backends import RestFrameworkFilterBackend
from .models import *
from .serializers import *
from .permissions import *
import django_filters


def visible_through_study(user, path, own_owner=False):
    """Rows reachable through a study the requester is allowed to read.

    `path` is the query path from the model being filtered to Study, or the
    empty string when filtering Study itself. Anonymous callers get the public
    branch only; the owner and shared_with branches need a real user, and
    comparing against AnonymousUser raises rather than matching nothing.

    `own_owner` adds the model's own owner field, so a row you created stays
    visible before it is used in any study. Only for models that have one:
    Assay, Sample and Measurement do not, and asking for it raises FieldError.
    """
    prefix = f'{path}__' if path else ''
    q = Q(**{f'{prefix}public': True})
    if not user.is_authenticated:
        return q
    q |= Q(**{f'{prefix}owner': user}) | Q(**{f'{prefix}shared_with': user})
    if own_owner:
        q |= Q(owner=user)
    return q


def get_required_id(request):
    raw_id = request.query_params.get('id')
    if raw_id is None:
        raise ValidationError({'id': 'This query parameter is required.'})
    try:
        return int(raw_id)
    except (TypeError, ValueError):
        raise ValidationError({'id': 'This query parameter must be an integer.'})


def get_object_by_id(model, object_id):
    try:
        return model.objects.get(id=object_id)
    except model.DoesNotExist:
        raise NotFound(f'{model.__name__} not found.')


def get_accessible_study(request, study_id):
    """Fetch a study only if the user may read it.

    NotFound rather than PermissionDenied, so the response cannot distinguish a
    private study from one that does not exist.
    """
    user = request.user
    try:
        return Study.objects.filter(
            Q(owner=user) | Q(public=True) | Q(shared_with=user)
        ).distinct().get(id=study_id)
    except Study.DoesNotExist:
        raise NotFound('Study not found.')


def get_accessible_assay(request, assay_id):
    """Fetch an assay only if the user may read its study."""
    user = request.user
    try:
        return Assay.objects.filter(
            Q(study__owner=user) |
            Q(study__public=True) |
            Q(study__shared_with=user)
        ).distinct().get(id=assay_id)
    except Assay.DoesNotExist:
        raise NotFound('Assay not found.')


# FilterSets

class StudyFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    doi = CharFilter(lookup_expr='exact')
    sboluri = CharFilter(lookup_expr='icontains')
    is_owner = BooleanFilter(field_name='owner', method='filter_is_owner')

    class Meta:
        model = Study
        fields = ('id',)

    def filter_is_owner(self, qs, name, value):
        # Filter the queryset handed in rather than re-querying Study, which
        # discarded any search term or prior filter in the chain.
        user = self.request.user
        return qs.filter(owner=user) if value else qs.exclude(owner=user)


class AssayFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    machine = CharFilter(lookup_expr='icontains')
    description = CharFilter(lookup_expr='icontains')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Assay
        fields = ('id', 'study', 'temperature')


class MediaFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    description = CharFilter(lookup_expr='icontains')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Media
        fields = ('id',)


class StrainFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    description = CharFilter(lookup_expr='icontains')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Strain
        fields = ('id',)


class ChemicalFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    description = CharFilter(lookup_expr='icontains')
    pubchemid = NumberFilter(lookup_expr='exact')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Chemical
        fields = ('id',)


class SupplementFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    concentration = NumberFilter(lookup_expr='exact')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Supplement
        fields = ('id', 'chemical')


class DnaFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Dna
        fields = ('id',)


class VectorFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')  
    dnas = RelatedFilter(DnaFilter, field_name='dnas',
                        queryset=Dna.objects.all())
    sboluri = CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Vector
        fields = ('id',)


class SampleFilter(FilterSet):
    sboluri = CharFilter(lookup_expr='icontains')
    
    class Meta:
        model = Sample
        fields = (
                'id', 
                'assay', 
                'media', 
                'strain', 
                'vector', 
                'supplements', 
                'row', 
                'col',
                'sboluri'
        )


class SignalFilter(FilterSet):
    name = CharFilter(lookup_expr='exact')
    description = CharFilter(lookup_expr='icontains')
    color = CharFilter(lookup_expr='icontains')
    sboluri = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Signal
        fields = ('id',)


class MeasurementFilter(FilterSet):
    class Meta:
        model = Measurement
        fields = ('id', 'sample', 'signal', 'value')

# ViewSets

class StudyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows studies to be viewed or edited.
    """
    permission_classes = [StudyPermission]
    queryset = Study.objects.all()
    serializer_class = StudySerializer
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    filterset_class = StudyFilter
    search_fields = ['name',  'description', 'doi', 'sboluri']
    
    def get_queryset(self):
        return Study.objects.filter(
            visible_through_study(self.request.user, '')).distinct()

    @action(detail=True, methods=['post'],
            permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        """Remove the caller from shared_with.

        Scoped to the caller rather than done through StudyPermission, which
        grants write access only to the owner. Widening that would let anyone
        a study is shared with edit or delete it.
        """
        study = self.get_object()
        if study.owner_id == request.user.pk:
            return Response({'detail': 'The owner cannot leave their own study.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not study.shared_with.filter(pk=request.user.pk).exists():
            return Response({'detail': 'This study is not shared with you.'},
                            status=status.HTTP_400_BAD_REQUEST)
        study.shared_with.remove(request.user)
        return Response({'detail': 'You left the study.'},
                        status=status.HTTP_200_OK)


class AssayViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows assays to be viewed or edited.
    """
    permission_classes = [AssayPermission]
    queryset = Assay.objects.all()
    serializer_class = AssaySerializer
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    filterset_class = AssayFilter
    search_fields = [
        'name',
        'machine',
        'description',
        'study__name',
        'study__description',
        'sboluri'
    ]

    def get_queryset(self):
        return Assay.objects.filter(
            visible_through_study(self.request.user, 'study')).distinct()


class MediaViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows media to be viewed or edited.
    """
    permission_classes = [MediaPermission]
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    filterset_class = MediaFilter
    search_fields = ['name', 'description', 'sboluri']

    def get_queryset(self):
        return Media.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='sample__assay__study')).distinct()


class StrainViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows strain to be viewed or edited.
    """
    permission_classes = [StrainPermission]
    queryset = Strain.objects.all()
    serializer_class = StrainSerializer
    filterset_class = StrainFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'description', 'sboluri']

    def get_queryset(self):
        return Strain.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='samples__assay__study')).distinct()


class ChemicalViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows chemical to be viewed or edited.
    """
    permission_classes = [ChemicalPermission]
    queryset = Chemical.objects.all()
    serializer_class = ChemicalSerializer
    filterset_class = ChemicalFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'description', 'sboluri']

    def get_queryset(self):
        return Chemical.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='supplement__samples__assay__study')).distinct()


class SupplementViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows supplement to be viewed or edited.
    """
    permission_classes = [SupplementPermission]
    queryset = Supplement.objects.all()
    serializer_class = SupplementSerializer
    filterset_class = SupplementFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'sboluri']

    def get_queryset(self):
        return Supplement.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='samples__assay__study')).distinct()


class DnaViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows dnas to be viewed or edited.
    """
    permission_classes = [DnaPermission]
    queryset = Dna.objects.all()
    serializer_class = DnaSerializer
    filterset_class = DnaFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = [
        'name',
        'sboluri'
    ]

    def get_queryset(self):
        return Dna.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='vectors__sample__assay__study')).distinct()


class VectorAllViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows vector to be viewed or edited.
    """
    permission_classes = [VectorPermission]
    queryset = Vector.objects.all()
    serializer_class = VectorAllSerializer
    filterset_class = VectorFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'sboluri']

    def get_queryset(self):
        return Vector.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='sample__assay__study')).distinct()


class VectorViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows vector to be viewed or edited.
    """
    permission_classes = [VectorPermission]
    queryset = Vector.objects.all()
    serializer_class = VectorSerializer
    filterset_class = VectorFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'sboluri']

    def get_queryset(self):
        return Vector.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='sample__assay__study')).distinct()


class SampleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows samples to be viewed or edited.
    """
    permission_classes = [SamplePermission]
    queryset = Sample.objects.all()
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    filterset_class = SampleFilter
    search_fields = [
        'assay__name',
        'media__name',
        'strain__name',
        'assay__description',
        'assay__study__name',
        'assay__study__description',
        'vector__name',
        'sboluri'
    ]

    def get_serializer_class(self):
        if self.action == 'create':
            return SampleSerializerCreate
        else:
            return SampleSerializer

    def get_queryset(self):
        return Sample.objects.filter(visible_through_study(
            self.request.user, 'assay__study')).distinct()


class SignalViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows signals to be viewed or edited.
    """
    permission_classes = [SignalPermission]
    queryset = Signal.objects.all()
    serializer_class = SignalSerializer
    filterset_class = SignalFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = ['name', 'description', 'color', 'sboluri']

    def get_queryset(self):
        return Signal.objects.filter(visible_through_study(
            self.request.user, own_owner=True, path='measurement__sample__assay__study')).distinct()


class MeasurementViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows measurements to be viewed or edited.
    """
    permission_classes = [MeasurementPermission]
    queryset = Measurement.objects.all()
    serializer_class = MeasurementSerializer
    filterset_class = MeasurementFilter
    filter_backends = [SearchFilter, RestFrameworkFilterBackend]
    search_fields = [
        'signal__name', 
        'sample__assay__name', 
        'sample__assay__study__name']

    def get_queryset(self):
        return Measurement.objects.filter(visible_through_study(
            self.request.user, 'sample__assay__study')).distinct()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """Resolves one identifier for the share-study picker.

    Deliberately not a directory. Listing accounts, or matching them on a
    substring, let anyone who registered harvest every address on the instance.
    Sharing needs to turn an identifier the owner already knows into a user, and
    that needs no enumeration: without an exact `identifier` the queryset is
    empty, which also stops `/user/<id>/` being walked.

    Read-only: account creation goes through the registration endpoint, which
    hashes the password. A writable ModelViewSet here would accept a plaintext
    password field and the is_superuser flag straight from the request body.
    """
    permission_classes = [UserPermission]
    serializer_class = UserSerializer
    filter_backends = []

    def get_queryset(self):
        identifier = self.request.query_params.get('identifier', '').strip()
        if not identifier:
            return User.objects.none()
        return User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier))


# These five populate the dependent dropdowns in View. Read-only, and they
# resolve their parent through the accessible-study predicate: without it any
# study or assay id returns its contents regardless of owner.

class AssaysInStudy(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that returns the objects related with a study
    """
    serializer_class = AssaySerializer
    queryset = Assay.objects.all()
    def get_queryset(self):
        study_id = get_required_id(self.request)
        return get_accessible_study(self.request, study_id).assay_set.all()


class VectorInAssay(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that returns the objects related with a study
    """
    serializer_class = VectorSerializer
    queryset = Vector.objects.all()
    def get_queryset(self):
        assay_id = get_required_id(self.request)
        samples = get_accessible_assay(self.request, assay_id).sample_set.all()
        return Vector.objects.filter(sample__in=samples).distinct()


class StrainInAssay(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that returns the objects related with a study
    """
    serializer_class = StrainSerializer
    queryset = Strain.objects.all()
    def get_queryset(self):
        assay_id = get_required_id(self.request)
        samples = get_accessible_assay(self.request, assay_id).sample_set.all()
        # samples__in is the reverse accessor of the Sample.strain M2M.
        return Strain.objects.filter(samples__in=samples).distinct()


class MediaInAssay(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that returns the objects related with a study
    """
    serializer_class = MediaSerializer
    queryset = Media.objects.all()
    def get_queryset(self):
        assay_id = get_required_id(self.request)
        samples = get_accessible_assay(self.request, assay_id).sample_set.all()
        return Media.objects.filter(sample__in=samples).distinct()


class SignalInAssay(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that returns the objects related with a study
    """
    serializer_class = SignalSerializer
    queryset = Signal.objects.all()
    def get_queryset(self):
        assay_id = get_required_id(self.request)
        samples = get_accessible_assay(self.request, assay_id).sample_set.all()
        meas = Measurement.objects.filter(sample__in=samples)
        return Signal.objects.filter(measurement__in=meas).distinct()
