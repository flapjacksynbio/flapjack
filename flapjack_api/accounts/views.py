from django.contrib.auth import get_user_model, authenticate
from rest_framework import permissions, response, decorators, status
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken, OutstandingToken)
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (ChangeEmailSerializer, ChangePasswordSerializer,
                          ChangeUsernameSerializer, UserCreateSerializer)

User = get_user_model()


def _revoke_all_refresh_tokens(user):
    """Sign every other session out.

    A password change that leaves old refresh tokens working does not evict
    whoever prompted the change.
    """
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.AllowAny])
def registration(request):
    serializer = UserCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    res = {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
    return response.Response(res, status.HTTP_201_CREATED)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.AllowAny])
def log_in(request):
    username = request.data.get('username')
    password = request.data.get('password')
    missing = {
        field: ['This field is required.']
        for field, value in (('username', username), ('password', password))
        if value is None
    }
    if missing:
        return response.Response(missing, status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)

    if user is None:
        # Fall back to treating the submitted value as an email address.
        # `User.email` is not unique at database level, so `.get()` could raise
        # MultipleObjectsReturned on pre-existing duplicate rows; `.first()`
        # degrades to "try the earliest matching account" instead of erroring.
        by_email = User.objects.filter(email__iexact=username).first()
        if by_email is not None:
            user = authenticate(username=by_email.username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        res = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            # Always the resolved account name, never the submitted value,
            # which may have been an email address.
            "username": user.username,
            "email": user.email
        }
        return response.Response(res, status.HTTP_200_OK)
    return response.Response({'detail': 'Invalid credentials.'},
                             status.HTTP_401_UNAUTHORIZED)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.IsAuthenticated])
def log_out(request):
    """Blacklist the caller's refresh token.

    Clearing client state alone leaves the token usable: a copy from persisted
    storage or a shared machine can keep minting access tokens until it expires.

    Only the refresh token is invalidated. An already-issued access token stays
    valid until expiry, so keep the access-token lifetime short.
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return response.Response({'refresh': ['This field is required.']},
                                 status.HTTP_400_BAD_REQUEST)
    try:
        RefreshToken(refresh_token).blacklist()
    except TokenError:
        # Malformed, expired, or already blacklisted. Deliberately narrow:
        # a blanket `except Exception` returning str(e) would leak internals.
        return response.Response({'detail': 'Invalid or expired refresh token.'},
                                 status.HTTP_401_UNAUTHORIZED)
    return response.Response({'detail': 'Logged out.'}, status.HTTP_200_OK)


@decorators.api_view(["GET"])
@decorators.permission_classes([permissions.IsAuthenticated])
def get_user_info(request):
    """Return the authenticated user's profile fields.

    The configured JWTAuthentication class handles the token, so it is not
    parsed here. Privilege flags are deliberately omitted: the frontend does
    not use them and exposing them is needless disclosure.
    """
    user = request.user
    res = {
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }
    return response.Response(res, status.HTTP_200_OK)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(
        data=request.data, context={'request': request})
    if not serializer.is_valid():
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)
    user = request.user
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    _revoke_all_refresh_tokens(user)
    # The caller loses its own session too, so hand back a fresh pair rather
    # than making a password change look like a logout.
    refresh = RefreshToken.for_user(user)
    return response.Response({
        'detail': 'Password updated. Other sessions were signed out.',
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }, status.HTTP_200_OK)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.IsAuthenticated])
def change_email(request):
    serializer = ChangeEmailSerializer(
        data=request.data, context={'request': request})
    if not serializer.is_valid():
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)
    user = request.user
    user.email = serializer.validated_data['email']
    user.save(update_fields=['email'])
    return response.Response({'detail': 'Email updated.', 'email': user.email},
                             status.HTTP_200_OK)


@decorators.api_view(["POST"])
@decorators.permission_classes([permissions.IsAuthenticated])
def change_username(request):
    serializer = ChangeUsernameSerializer(
        data=request.data, context={'request': request})
    if not serializer.is_valid():
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)
    user = request.user
    user.username = serializer.validated_data['username']
    user.save(update_fields=['username'])
    return response.Response(
        {'detail': 'Username updated.', 'username': user.username},
        status.HTTP_200_OK)
