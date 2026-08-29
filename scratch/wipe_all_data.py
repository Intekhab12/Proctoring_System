import os
import sys

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from exams.models import (
    Exam, Question, ExamEligibility, Submission, Answer, 
    ProctoringLog, ExamAudioRecording, ExamVideoRecording, 
    Dispute, DisputeMessage
)
from users.models import Notification, OTPVerification
from django.conf import settings

print("========================================")
print("     STARTING FULL SYSTEM CLEANUP       ")
print("========================================")

# 1. Clear Disputes and Messages
dispute_msg_count = DisputeMessage.objects.all().delete()[0]
dispute_count = Dispute.objects.all().delete()[0]
print(f"Cleared {dispute_msg_count} dispute messages & {dispute_count} disputes.")

# 2. Clear Recordings, Logs & Answers
video_count = ExamVideoRecording.objects.all().delete()[0]
audio_count = ExamAudioRecording.objects.all().delete()[0]
log_count = ProctoringLog.objects.all().delete()[0]
ans_count = Answer.objects.all().delete()[0]
print(f"Cleared {video_count} video recordings, {audio_count} audio recordings, {log_count} proctoring logs, {ans_count} answers.")

# 3. Clear Submissions
sub_count = Submission.objects.all().delete()[0]
print(f"Cleared {sub_count} exam submissions.")

# 4. Clear Exam Eligibilities & Questions
elig_count = ExamEligibility.objects.all().delete()[0]
q_count = Question.objects.all().delete()[0]
print(f"Cleared {elig_count} exam eligibilities & {q_count} questions.")

# 5. Clear Exams
exam_count = Exam.objects.all().delete()[0]
print(f"Cleared {exam_count} exams.")

# 6. Clear Notifications & OTPs
notif_count = Notification.objects.all().delete()[0]
otp_count = OTPVerification.objects.all().delete()[0]
print(f"Cleared {notif_count} notifications & {otp_count} OTP verifications.")

# 7. Clear Media files (video recordings, audio, screenshots, question images, etc.)
media_dir = settings.MEDIA_ROOT
deleted_files = 0
if os.path.exists(media_dir):
    for root, dirs, files in os.walk(media_dir):
        for f in files:
            file_path = os.path.join(root, f)
            try:
                os.remove(file_path)
                deleted_files += 1
            except Exception as e:
                print(f"Failed to remove {file_path}: {e}")
                
    # Clean empty subdirs
    for root, dirs, files in os.walk(media_dir, topdown=False):
        for d in dirs:
            dir_path = os.path.join(root, d)
            try:
                if not os.listdir(dir_path):
                    os.rmdir(dir_path)
            except Exception as e:
                pass

print(f"Deleted {deleted_files} media files from {media_dir}.")
print("========================================")
print("       CLEANUP COMPLETED SUCCESSFULLY   ")
print("========================================")
