# https://hashnode.com/post/using-django-drf-jwt-authentication-with-django-channels-cjzy5ffqs0013rus1yb9huxvl

from channels.db import database_sync_to_async
from django.db import close_old_connections
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode, InvalidTokenError
from django.conf import settings
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token):
    """Validate the token and load its user.

    Wrapped so the query runs in a worker thread; the connection path is async.
    """
    # Close old database connections to prevent usage of timed out connections
    close_old_connections()

    User = get_user_model()
    # Raises if the token is invalid or expired
    UntypedToken(token)
    decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    return User.objects.get(id=decoded_data["user_id"])


class TokenAuthMiddlewareInstance:
    """Resolves the user before handing the connection to the inner app."""

    def __init__(self, scope, middleware):
        self.scope = dict(scope)
        self.inner = middleware.inner

    async def _reject(self, receive, send, code):
        """Close the handshake instead of raising.

        DenyConnection is only caught by Channels' consumer base class, so
        raising it here went unhandled and surfaced as an HTTP 500. Consuming
        the connect message and replying with a close rejects the handshake
        cleanly. 4401 and 4403 follow the WebSocket private-use range and mirror
        HTTP 401 and 403.
        """
        await receive()
        await send({"type": "websocket.close", "code": code})

    async def __call__(self, receive, send):
        token_values = parse_qs(
            self.scope["query_string"].decode("utf8")
        ).get("token")
        if not token_values:
            return await self._reject(receive, send, 4401)

        User = get_user_model()
        try:
            user = await get_user_from_token(token_values[0])
        except (InvalidToken, TokenError, InvalidTokenError, KeyError,
                IndexError, User.DoesNotExist):
            return await self._reject(receive, send, 4403)

        self.scope["user"] = user
        inner = self.inner(self.scope)
        return await inner(receive, send)


class TokenAuthMiddleware:
    """
    Custom token auth middleware
    """

    def __init__(self, inner):
        # Store the ASGI application we were passed
        self.inner = inner

    def __call__(self, scope):
        return TokenAuthMiddlewareInstance(scope, self)
