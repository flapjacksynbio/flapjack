from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (registration, log_in, log_out, get_user_info,
                    change_password, change_email, change_username)

urlpatterns = [
    path('register/', registration, name='register'),
    path('log_in/', log_in, name='log_in'),
    path('log_out/', log_out, name='log_out'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user_info/', get_user_info, name='user_info'),
    path('change_password/', change_password, name='change_password'),
    path('change_email/', change_email, name='change_email'),
    path('change_username/', change_username, name='change_username'),
]
