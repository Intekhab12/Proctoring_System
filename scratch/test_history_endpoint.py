import os
import sys
import django

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from users.models import User
from exams.views import CandidateExamHistoryView

def test_endpoint():
    user = User.objects.filter(is_candidate=True).first() or User.objects.first()
    factory = APIRequestFactory()
    request = factory.get('/api/candidate/exams/')
    force_authenticate(request, user=user)

    view = CandidateExamHistoryView.as_view()
    response = view(request)
    print("Status Code:", response.status_code)
    import json
    print("Response Data:", json.dumps(response.data, indent=2))

if __name__ == '__main__':
    test_endpoint()
