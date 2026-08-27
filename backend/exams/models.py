import uuid
from django.db import models
from django.conf import settings

class Exam(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exams_created')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    guidelines = models.TextField(blank=True, null=True)
    duration_minutes = models.PositiveIntegerField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    randomize_questions = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    results_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Question(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    image = models.ImageField(upload_to='question_images/', blank=True, null=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Question for {self.exam.title}"

class ExamEligibility(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('registered', 'Registered'),
        ('started', 'Started'),
        ('submitted', 'Submitted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='eligibilities')
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='exam_eligibilities',
        blank=True, 
        null=True
    )
    email = models.EmailField()
    handle = models.CharField(max_length=50, blank=True, null=True)
    invited_via = models.CharField(max_length=20, default='manual')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        unique_together = ('exam', 'email')

    def __str__(self):
        return f"{self.email} for {self.exam.title}"

class Submission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='submissions')
    status = models.CharField(max_length=20, default='registered')
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    total_score = models.IntegerField(null=True, blank=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('candidate', 'exam')

    def __str__(self):
        return f"Submission by {self.candidate.email} for {self.exam.title}"

class Answer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    text_answer = models.TextField(blank=True, null=True)
    whiteboard_data = models.TextField(blank=True, null=True)
    score = models.IntegerField(null=True, blank=True)
    marks_awarded = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('submission', 'question')

    def __str__(self):
        return f"Answer to {self.question.id} for Submission {self.submission.id}"

class ProctoringLog(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='proctoring_logs')
    event_type = models.CharField(max_length=50)
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)
    evidence = models.FileField(upload_to='proctoring_evidence/', null=True, blank=True)
    flagged = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} for Submission {self.submission.id}"

class ExamAudioRecording(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name='full_audio_recording')
    audio_file = models.FileField(upload_to='proctoring_full_audio/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Full Audio Recording for Submission {self.submission.id}"

class ExamVideoRecording(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name='video_recording')
    video_file = models.FileField(upload_to='proctoring_videos/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Video Recording for Submission {self.submission.id}"

