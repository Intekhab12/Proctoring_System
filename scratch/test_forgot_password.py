import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

# Create user with inte4071@gmail.com
u, _ = User.objects.get_or_create(email='inte4071@gmail.com', defaults={'full_name': 'Intekhab'})
u.set_password('password123')
u.save()

client = APIClient()
res = client.post('/api/auth/forgot-password/', {'email': 'inte4071@gmail.com'})
print("Status when user exists in DB:", res.status_code)
print("Data:", res.data)
