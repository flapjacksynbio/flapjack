from django.contrib import admin
from django.urls import include, path

from .views import api_info

urlpatterns = [
    # Registered before the registry include so it is not shadowed by the
    # router mounted at ^api/.
    path('api/info/', api_info, name='api_info'),
    path('', include('registry.urls')),
    path('api/auth/', include('accounts.urls'), name='accounts'),
    path('admin/', admin.site.urls),
]