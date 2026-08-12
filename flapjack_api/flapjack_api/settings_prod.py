"""Production settings.

Use with DJANGO_SETTINGS_MODULE=flapjack_api.settings_prod.

Every secret and host-specific value is read from the environment with no
fallback, so a missing variable fails loudly at startup rather than silently
running with a development default. See .env.prod.example for the full list.
"""

import os

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F401,F403


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise ImproperlyConfigured(
            f"{name} must be set when using the production settings"
        )
    return value


def split_env(name):
    return [item.strip() for item in require_env(name).split(',') if item.strip()]


SECRET_KEY = require_env('DJANGO_SECRET_KEY')

DEBUG = False

ALLOWED_HOSTS = split_env('DJANGO_ALLOWED_HOSTS')

# Never allow every origin in production; list the frontend origins explicitly.
CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = split_env('DJANGO_CORS_ALLOWED_ORIGINS')
CORS_ORIGIN_WHITELIST = [
    x.strip()
    for x in os.environ.get(
        "DJANGO_CORS_ALLOWED_ORIGINS", ""
    ).split(",")
    if x.strip()
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': require_env('SQL_DATABASE'),
        'USER': require_env('SQL_USER'),
        'PASSWORD': require_env('SQL_PASSWORD'),
        'HOST': require_env('SQL_HOST'),
        'PORT': os.environ.get('SQL_PORT', '5432'),
        # Forces libpq to send SET timezone=UTC on every new connection, which
        # Django 3.0's postgres backend asserts on.
        'OPTIONS': {'options': '-c timezone=UTC'},
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.environ.get('REDIS_HOST', 'redis'),
                       int(os.environ.get('REDIS_PORT', 6379)))],
        },
    },
}

# Behind a TLS-terminating reverse proxy, trust its forwarded scheme so Django
# builds correct absolute URLs and does not redirect-loop.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', '1') == '1'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
