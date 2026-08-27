import os
import sys
import django

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from exams.models import Submission

sub = Submission.objects.order_by('-started_at').first()
print(f"=== LATEST SUBMISSION: {sub.id} ===")
print(f"Started At: {sub.started_at}")
print(f"Submitted At: {sub.submitted_at}")

vr = getattr(sub, 'video_recording', None)
if vr and vr.video_file:
    file_path = vr.video_file.path
    print(f"Video file path: {file_path}")
    print(f"File size: {os.path.getsize(file_path)} bytes")

    # Read first 100 bytes of WebM header
    with open(file_path, 'rb') as f:
        header = f.read(100)
        print("Header bytes (hex):", header.hex())
else:
        print("No video file found!")
