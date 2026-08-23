from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, UserProfileView, ForgotPasswordView, 
    VerifyOTPAndResetPasswordView, ProfilePictureUploadView, NotificationViewSet
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/verify-otp/', VerifyOTPAndResetPasswordView.as_view(), name='verify_otp'),
    
    path('users/me/', UserProfileView.as_view(), name='user_profile'),
    path('users/me/upload-picture/', ProfilePictureUploadView.as_view(), name='upload_picture'),
    path('users/', include(router.urls)),
]
