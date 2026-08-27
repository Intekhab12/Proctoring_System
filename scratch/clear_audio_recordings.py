import os
import sys
import django

# Add backend directory to Python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from exams.models import ExamAudioRecording

count, _ = ExamAudioRecording.objects.all().delete()
print(f"[Cleanup] Deleted {count} legacy ExamAudioRecording objects.")
