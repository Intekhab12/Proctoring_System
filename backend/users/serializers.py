from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Notification

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'contact_number', 'handle', 'institution', 'profile_picture', 'is_examiner', 'is_candidate', 'date_joined']
        read_only_fields = ['id', 'email', 'is_examiner', 'is_candidate', 'date_joined']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    
    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'contact_number', 'handle', 'institution']

    def create(self, validated_data):
        # Auto generate handle if not provided
        if not validated_data.get('handle'):
            base_handle = validated_data['email'].split('@')[0]
            handle = base_handle
            counter = 1
            while User.objects.filter(handle=handle).exists():
                handle = f"{base_handle}{counter}"
                counter += 1
            validated_data['handle'] = handle
            
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            contact_number=validated_data.get('contact_number', ''),
            handle=validated_data.get('handle'),
            institution=validated_data.get('institution', '')
        )
        return user

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'link', 'is_read', 'created_at']

