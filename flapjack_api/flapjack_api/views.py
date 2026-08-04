from django.conf import settings
from rest_framework import decorators, permissions, response, status


@decorators.api_view(["GET"])
@decorators.permission_classes([permissions.AllowAny])
def api_info(request):
    """Advertise this backend's canonical base URLs.

    Lets a deployed frontend discover which backend it is bound to rather than
    relying only on build-time environment variables.

    The HTTP base includes the trailing /api/ and the websocket base the
    trailing /ws/, so both can be used directly as REACT_APP_HTTP_API and
    REACT_APP_WS_API. When the settings are blank the values come from the
    request, which is right for local Docker; set them explicitly behind a
    reverse proxy whose public host differs.
    """
    http_api = settings.FLAPJACK_PUBLIC_HTTP_API
    if not http_api:
        http_api = request.build_absolute_uri('/api/')

    ws_api = settings.FLAPJACK_PUBLIC_WS_API
    if not ws_api:
        scheme = 'wss' if request.is_secure() else 'ws'
        ws_api = f'{scheme}://{request.get_host()}/ws/'

    res = {
        "name": "Flapjack API",
        "version": settings.FLAPJACK_API_VERSION,
        "http_api": http_api,
        "ws_api": ws_api,
    }
    return response.Response(res, status.HTTP_200_OK)
