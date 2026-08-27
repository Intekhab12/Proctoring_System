import os
import sys
import django

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from exams.models import Submission

sub = Submission.objects.order_by('-started_at').first()
if sub:
    print(f"=== SUBMISSION: {sub.id} ===")
    print(f"Started At: {sub.started_at}")
    print(f"Submitted At: {sub.submitted_at}")
    vr = getattr(sub, 'video_recording', None)
    if vr:
        print(f"Video uploaded_at: {vr.uploaded_at}, path: {vr.video_file.name}")
    for log in sub.proctoring_logs.all().order_by('timestamp'):
        print(f"Log {log.id} | Event: {log.event_type} | Time: {log.timestamp} | Details: {log.details}")
