import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()
u, _ = User.objects.get_or_create(email='proctorbud76@gmail.com', defaults={'full_name': 'Proctor Buddy'})
u.set_password('pass123')
u.save()

client = APIClient()
res = client.post('/api/auth/forgot-password/', {'email': 'proctorbud76@gmail.com'})
print("Status:", res.status_code)
print("Response:", res.data)
