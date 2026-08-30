import random
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from .serializers import UserSerializer, RegisterSerializer, NotificationSerializer
from .models import OTPVerification, Notification
from django.contrib.auth.hashers import check_password
from rest_framework import viewsets

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        password = request.data.get('password')
        if not password or not user.check_password(password):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response({'message': 'Account successfully deleted.'}, status=status.HTTP_204_NO_CONTENT)
        
    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

class ProfilePictureUploadView(views.APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        user = request.user
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
            user.save()
            return Response({'message': 'Profile picture uploaded.', 'profile_picture': user.profile_picture.url})
        return Response({'error': 'No picture provided.'}, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(views.APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'message': 'If an account exists with this email, an OTP has been sent.'}, status=status.HTTP_200_OK)

        otp = str(random.randint(100000, 999999))
        OTPVerification.objects.filter(email__iexact=email).delete() # Remove old OTPs
        OTPVerification.objects.create(email=user.email, otp=otp)

        try:
            send_mail(
                'Password Reset OTP - ProctorBuddy',
                f'Your OTP for password reset is {otp}. It is valid for 10 minutes.',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"[OTP Dispatch] Failed to send email via SMTP: {e}")
            print(f"[OTP Fallback Console] Password reset OTP for {user.email} is: {otp}")

        return Response({'message': 'If an account exists with this email, an OTP has been sent.'}, status=status.HTTP_200_OK)

class VerifyOTPAndResetPasswordView(views.APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp = (request.data.get('otp') or '').strip()
        new_password = request.data.get('new_password')

        if not all([email, otp, new_password]):
            return Response({'error': 'Email, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verification = OTPVerification.objects.get(email__iexact=email, otp=otp)
            if not verification.is_valid():
                return Response({'error': 'OTP has expired.'}, status=status.HTTP_400_BAD_REQUEST)
                
            user = User.objects.get(email__iexact=email)
            user.set_password(new_password)
            user.save()
            
            verification.delete()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
            
        except (OTPVerification.DoesNotExist, User.DoesNotExist):
            return Response({'error': 'Invalid OTP or email.'}, status=status.HTTP_400_BAD_REQUEST)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.notifications.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
