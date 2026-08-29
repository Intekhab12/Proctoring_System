import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from exams.models import Exam
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

# Ensure examiner user exists
examiner, _ = User.objects.get_or_create(
    email='examiner_test@proctorbuddy.com',
    defaults={
        'full_name': 'Test Examiner',
        'is_examiner': True,
        'is_candidate': False
    }
)
examiner.is_examiner = True
examiner.is_candidate = False
examiner.set_password('password123')
examiner.save()

# Create a test exam
exam, _ = Exam.objects.get_or_create(
    title='Test CS Exam',
    creator=examiner,
    defaults={
        'duration_minutes': 60,
        'start_time': timezone.now(),
        'end_time': timezone.now() + timedelta(days=2)
    }
)

client = APIClient()
client.force_authenticate(user=examiner)

print(f"Testing endpoints for exam ID: {exam.id}")

endpoints = [
    f"/api/exams/{exam.id}/",
    f"/api/exams/{exam.id}/questions/",
    f"/api/exams/{exam.id}/eligibility/",
    f"/api/exams/{exam.id}/disputes/",
    f"/api/exams/{exam.id}/submissions/",
]

for ep in endpoints:
    res = client.get(ep)
    print(f"GET {ep} -> Status {res.status_code}")
    if res.status_code != 200:
        print(f"  ERROR Content: {res.content}")
