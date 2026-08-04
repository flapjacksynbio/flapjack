from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS


class ReadAnyWriteAuthenticated(BasePermission):
    """Anonymous reads, authenticated writes.

    Read access is still bounded by each viewset's get_queryset, which admits a
    row only through a study that is public, owned, or shared. This class only
    decides whether the request gets that far.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


class StudyPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        return request.user == obj.owner


class AssayPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        return request.user == obj.study.owner


class MediaPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            if len(obj.sample_set.all()) == 0 and request.user == obj.owner:
                return True
            return False


class StrainPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            if len(obj.sample_set.all()) == 0 and request.user == obj.owner:
                return True
            return False


class ChemicalPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            # The return was missing here, so this fell through to None and
            # every chemical detail read was refused, including the owner's.
            return True
        else:
            if len(obj.supplement_set.all()) == 0 and request.user == obj.owner:
                return True
            return False

class SupplementPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            if len(obj.samples.all()) == 0 and request.user == obj.owner:
                return True
            return False


class DnaPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            for vector in obj.vectors.all():
                for sample in vector.sample_set.all():
                    if request.user != sample.assay.study.owner:
                        return False
            return True


class VectorPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            for sample in obj.sample_set.all():
                if request.user != sample.assay.study.owner:
                    return False
            return True


class SamplePermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        return request.user == obj.assay.study.owner


class SignalPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            if len(obj.measurement_set.all()) == 0 and request.user == obj.owner:
                return True
            return False


class MeasurementPermission(ReadAnyWriteAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True
        else:
            return request.user == obj.sample.assay.study.owner

class UserPermission(IsAuthenticated):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True