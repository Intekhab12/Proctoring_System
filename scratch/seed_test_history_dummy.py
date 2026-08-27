import os
import sys
import django

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from users.models import User
from exams.models import Exam, ExamEligibility

def seed_test_history():
    user = User.objects.filter(is_candidate=True).first() or User.objects.first()
    if not user:
        print("No user found in database.")
        return

    creator = User.objects.filter(is_examiner=True).first() or user
    now = timezone.now()

    # Past Exam
    past_exam, _ = Exam.objects.get_or_create(
        title="Maths Final",
        defaults={
            'creator': creator,
            'duration_minutes': 30,
            'start_time': now - timedelta(days=2),
            'end_time': now - timedelta(days=2, hours=-1),
            'is_published': True
        }
    )
    ExamEligibility.objects.get_or_create(
        exam=past_exam,
        email=user.email,
        defaults={'candidate': user, 'status': 'submitted'}
    )

    # Future Exam
    future_exam, _ = Exam.objects.get_or_create(
        title="Science Midterm",
        defaults={
            'creator': creator,
            'duration_minutes': 60,
            'start_time': now + timedelta(days=5),
            'end_time': now + timedelta(days=5, hours=1),
            'is_published': True
        }
    )
    ExamEligibility.objects.get_or_create(
        exam=future_exam,
        email=user.email,
        defaults={'candidate': user, 'status': 'registered'}
    )

    print(f"[Seed] Created dummy exams for candidate {user.email}")

if __name__ == '__main__':
    seed_test_history()
