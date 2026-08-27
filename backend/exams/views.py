import csv
import io
from rest_framework import viewsets, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone

from .models import Exam, Question, ExamEligibility, Submission, Answer, ProctoringLog, ExamAudioRecording, ExamVideoRecording
from .serializers import (
    ExamSerializer, QuestionSerializer, ExamEligibilitySerializer,
    SubmissionEvaluationSerializer, AnswerEvaluationSerializer,
    ProctoringLogSerializer
)
from .permissions import IsExaminer, IsExamCreator
from django.core.mail import send_mail
from django.db.models import Sum, Q
from .utils import notify_candidate

class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    permission_classes = [IsExaminer, IsExamCreator]

    def get_queryset(self):
        # Only return exams created by the logged-in user
        return Exam.objects.filter(creator=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['patch'])
    def publish(self, request, pk=None):
        exam = self.get_object()
        exam.is_published = True
        exam.save()
        return Response({'status': 'Exam published', 'is_published': True})

    @action(detail=True, methods=['get'], url_path='share-link')
    def share_link(self, request, pk=None):
        exam = self.get_object()
        # You could pull the frontend URL from settings if configured
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        link = f"{frontend_url}/exam/register/{exam.id}"
        return Response({'link': link})

    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        exam = self.get_object()
        submissions = Submission.objects.filter(exam=exam).select_related('candidate')
        serializer = SubmissionEvaluationSerializer(submissions, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsExaminer, IsExamCreator]

    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk')
        return Question.objects.filter(exam_id=exam_id, exam__creator=self.request.user)

    def perform_create(self, serializer):
        exam_id = self.kwargs.get('exam_pk')
        exam = get_object_or_404(Exam, id=exam_id, creator=self.request.user)
        serializer.save(exam=exam)

    @action(detail=False, methods=['post'])
    def bulk(self, request, exam_pk=None):
        exam = get_object_or_404(Exam, id=exam_pk, creator=self.request.user)
        questions_data = request.data
        if not isinstance(questions_data, list):
            return Response({'error': 'Expected a list of questions'}, status=status.HTTP_400_BAD_REQUEST)
        
        created_questions = []
        for q_data in questions_data:
            # We don't handle images in bulk upload via JSON right now based on prompt specs
            q = Question(
                exam=exam,
                text=q_data.get('text', ''),
                order=q_data.get('order', 0)
            )
            q.save()
            created_questions.append(q)
            
        serializer = self.get_serializer(created_questions, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExamEligibilityViewSet(viewsets.ModelViewSet):
    serializer_class = ExamEligibilitySerializer
    permission_classes = [IsExaminer, IsExamCreator]

    def get_queryset(self):
        exam_id = self.kwargs.get('exam_pk')
        return ExamEligibility.objects.filter(exam_id=exam_id, exam__creator=self.request.user)

    def create(self, request, *args, **kwargs):
        exam_id = self.kwargs.get('exam_pk')
        exam = get_object_or_404(Exam, id=exam_id, creator=self.request.user)
        email = request.data.get('email')
        
        if ExamEligibility.objects.filter(exam=exam, email=email).exists():
            return Response({'message': 'Candidate already added.'}, status=status.HTTP_200_OK)
            
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        exam_id = self.kwargs.get('exam_pk')
        exam = get_object_or_404(Exam, id=exam_id, creator=self.request.user)
        entry = serializer.save(exam=exam, invited_via='manual')
        if exam.is_published:
            notify_candidate(exam, entry)

    @action(detail=False, methods=['post'])
    def csv(self, request, exam_pk=None):
        exam = get_object_or_404(Exam, id=exam_pk, creator=self.request.user)
        
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        csv_file = request.FILES['file']
        
        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Handle possible BOM from Excel
            file_data = csv_file.read().decode('utf-8-sig')
            
            try:
                dialect = csv.Sniffer().sniff(file_data[:1024] if len(file_data) > 1024 else file_data)
                reader = csv.reader(io.StringIO(file_data), dialect)
            except Exception:
                reader = csv.reader(io.StringIO(file_data))
            
            headers = [h.strip().lower() for h in next(reader, [])]
            
            email_idx = None
            handle_idx = None
            for i, h in enumerate(headers):
                if 'email' in h:
                    email_idx = i
                elif 'handle' in h or 'name' in h:
                    handle_idx = i
            
            if email_idx is None:
                return Response({'error': f'CSV must contain an "email" column. Found: {", ".join(headers)}'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_count = 0
            for row in reader:
                if len(row) > email_idx:
                    email = row[email_idx].strip()
                    handle = row[handle_idx].strip() if handle_idx is not None and len(row) > handle_idx else ''
                    
                    if email:
                        # Use get_or_create to avoid duplicates for the same exam
                        obj, created = ExamEligibility.objects.get_or_create(
                            exam=exam,
                            email=email,
                            defaults={'handle': handle, 'invited_via': 'csv'}
                        )
                        if created:
                            created_count += 1
                            if exam.is_published:
                                notify_candidate(exam, obj)
                        
            return Response({'status': 'Success', 'added': created_count}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ExamRegistrationView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, exam_id):
        user = request.user
        try:
            exam = Exam.objects.get(id=exam_id, is_published=True)
        except Exam.DoesNotExist:
            raise ValidationError({'error': "Exam not found or not published."})
        
        # 1. Check eligibility
        eligibility = ExamEligibility.objects.filter(exam=exam, email=user.email).first()
        if not eligibility:
            raise PermissionDenied({'error': "You are not eligible for this exam."})
        
        # 2. Check status
        if eligibility.status != 'pending':
            return Response({'message': 'You are already registered for this exam.'}, status=400)
        
        # 3. Check time window
        now = timezone.now()
        if now > exam.end_time:
            raise ValidationError({'error': "Registration is closed as the exam window has ended."})
        
        # 4. Update eligibility
        eligibility.status = 'registered'
        eligibility.candidate = user
        eligibility.save()
        
        # 5. Create Submission record
        submission = Submission.objects.create(
            candidate=user,
            exam=exam,
            status='registered',
        )
        
        return Response({
            'message': 'Successfully registered!',
            'submission_id': submission.id,
            'exam': {
                'title': exam.title,
                'start_time': exam.start_time,
                'duration': exam.duration_minutes,
            }
        })


class AvailableExamsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Get all eligibilities for this user that are 'pending' or 'registered'
        # We also need to join the exam table to filter by is_published=True
        # and maybe time window, but let's just return what they are eligible for.
        now = timezone.now()
        
        pending_eligibilities = ExamEligibility.objects.filter(
            email=user.email,
            status='pending',
            exam__is_published=True,
            exam__end_time__gt=now
        ).select_related('exam')
        
        registered_eligibilities = ExamEligibility.objects.filter(
            email=user.email,
            status='registered',
            exam__is_published=True
        ).select_related('exam')
        
        def format_exam(e_obj):
            return {
                'id': e_obj.exam.id,
                'title': e_obj.exam.title,
                'start_time': e_obj.exam.start_time,
                'end_time': e_obj.exam.end_time,
                'duration_minutes': e_obj.exam.duration_minutes,
                'status': e_obj.status
            }
            
        available = [format_exam(e) for e in pending_eligibilities]
        registered = [format_exam(e) for e in registered_eligibilities]
        
        return Response({
            'available': available,
            'registered': registered
        })

class CandidateExamStatusView(views.APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, exam_id):
        user = request.user
        try:
            exam = Exam.objects.get(id=exam_id)
        except Exam.DoesNotExist:
            return Response({'error': "Exam not found."}, status=404)
            
        eligibility = ExamEligibility.objects.filter(exam=exam, email=user.email).first()
        
        status_info = {
            'exam': {
                'id': exam.id,
                'title': exam.title,
                'start_time': exam.start_time,
                'end_time': exam.end_time,
                'duration_minutes': exam.duration_minutes,
                'is_published': exam.is_published
            },
            'is_eligible': eligibility is not None,
            'status': eligibility.status if eligibility else None,
        }
        
        return Response(status_info)

class ExamTakeView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, exam_id):
        try:
            exam = Exam.objects.get(id=exam_id, is_published=True)
            submission = Submission.objects.get(exam=exam, candidate=request.user)
        except (Exam.DoesNotExist, Submission.DoesNotExist):
            raise PermissionDenied("You do not have access to this exam or it does not exist.")
        
        if submission.status == 'submitted':
            raise PermissionDenied("You have already submitted this exam.")

        now = timezone.now()
        if now < exam.start_time or now > exam.end_time:
            raise ValidationError("You are outside the allowed exam window.")
        
        # Start the exam if not started
        if submission.status == 'registered' or not submission.started_at:
            submission.started_at = now
            submission.status = 'started'
            # Also update eligibility status
            eligibility = ExamEligibility.objects.filter(exam=exam, email=request.user.email).first()
            if eligibility:
                eligibility.status = 'started'
                eligibility.save()
            submission.save()
        
        import random
        # Get questions
        questions = list(exam.questions.all().order_by('order', 'id'))
        if exam.randomize_questions:
            random.Random(submission.id.int).shuffle(questions)
        # Get existing answers
        existing_answers = Answer.objects.filter(submission=submission)
        answers_dict = {str(a.question.id): a.text_answer for a in existing_answers}
        whiteboard_dict = {str(a.question.id): a.whiteboard_data for a in existing_answers if a.whiteboard_data}
        
        q_data = [{
            'id': str(q.id),
            'text': q.text,
            'image_url': request.build_absolute_uri(q.image.url) if q.image else None
        } for q in questions]

        return Response({
            'exam': {
                'id': str(exam.id),
                'title': exam.title,
                'duration_minutes': exam.duration_minutes,
                'start_time': exam.start_time,
                'end_time': exam.end_time
            },
            'submission_id': str(submission.id),
            'started_at': submission.started_at,
            'questions': q_data,
            'answers': answers_dict,
            'whiteboard_data': whiteboard_dict
        })

class SaveAnswerView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        question_id = request.data.get('question_id')
        text_answer = request.data.get('text_answer', '')
        whiteboard_data = request.data.get('whiteboard_data')

        try:
            submission = Submission.objects.get(id=submission_id, candidate=request.user)
        except Submission.DoesNotExist:
            raise PermissionDenied("Submission not found.")

        if submission.status == 'submitted':
            raise ValidationError("Exam already submitted.")
            
        try:
            question = Question.objects.get(id=question_id, exam=submission.exam)
        except Question.DoesNotExist:
            raise ValidationError("Question not found in this exam.")

        answer, created = Answer.objects.get_or_create(
            submission=submission, 
            question=question,
            defaults={
                'text_answer': text_answer,
                'whiteboard_data': whiteboard_data
            }
        )
        if not created:
            answer.text_answer = text_answer
            if whiteboard_data is not None:
                answer.whiteboard_data = whiteboard_data
            answer.save()
            
        return Response({'message': 'Answer saved.'})

class SubmitExamView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id, candidate=request.user)
        except Submission.DoesNotExist:
            raise PermissionDenied("Submission not found.")

        if submission.status == 'submitted':
            return Response({'message': 'Already submitted.'})
            
        submission.status = 'submitted'
        submission.submitted_at = timezone.now()
        submission.save()
        
        eligibility = ExamEligibility.objects.filter(exam=submission.exam, email=request.user.email).first()
        if eligibility:
            eligibility.status = 'submitted'
            eligibility.save()
            
        return Response({'message': 'Exam submitted successfully.'})

class SubmissionDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        if submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can view this submission.")
        
        serializer = SubmissionEvaluationSerializer(submission)
        return Response(serializer.data)

class AnswerGradingView(views.APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, answer_id):
        answer = get_object_or_404(Answer, id=answer_id)
        if answer.submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can grade this answer.")
        
        marks = request.data.get('marks_awarded')
        feedback = request.data.get('feedback')
        
        if marks is not None:
            answer.marks_awarded = int(marks)
        if feedback is not None:
            answer.feedback = feedback
            
        answer.save()
        return Response({'message': 'Grading updated successfully'})

class PublishResultsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        if submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can publish these results.")
        
        # Calculate total score
        total_marks = submission.answers.aggregate(Sum('marks_awarded'))['marks_awarded__sum']
        submission.total_score = total_marks or 0
        submission.status = 'evaluated'
        submission.evaluated_at = timezone.now()
        submission.save()
        
        # Send email notification
        candidate_email = submission.candidate.email
        send_mail(
            subject=f"Results Published: {submission.exam.title}",
            message=f"Hi {submission.candidate.full_name or 'Candidate'},\n\n"
                    f"Your results for {submission.exam.title} have been published.\n"
                    f"Please log in to your dashboard and view your results in the My Tests section.\n\n"
                    f"Thank you,\nProctoring System Team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[candidate_email],
            fail_silently=True,
        )

        # In-app notification
        from users.models import Notification
        Notification.objects.create(
            user=submission.candidate,
            title="Results Published",
            message=f"Your results for {submission.exam.title} have been published. Check 'My Tests' for details.",
            link=f"/candidate-results/{submission.id}"
        )
        
        return Response({'message': 'Results published successfully.'})

class ProctoringLogCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import json
        submission_id = request.data.get('submission_id')
        event_type = request.data.get('event_type')
        details = request.data.get('details', {})
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except json.JSONDecodeError:
                details = {}
        evidence = request.FILES.get('evidence')

        if not submission_id or not event_type:
            return Response({'error': 'submission_id and event_type are required'}, status=status.HTTP_400_BAD_REQUEST)

        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)
        
        if submission.status == 'submitted':
            return Response({'error': 'Exam already submitted'}, status=status.HTTP_400_BAD_REQUEST)

        log = ProctoringLog.objects.create(
            submission=submission,
            event_type=event_type,
            details=details,
            evidence=evidence
        )
        return Response({'message': 'Log created successfully', 'id': log.id}, status=status.HTTP_201_CREATED)

class ProctoringScreenshotUploadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        submission_id = request.data.get('submission_id')
        evidence = request.FILES.get('evidence')

        if not submission_id or not evidence:
            return Response({'error': 'submission_id and evidence are required'}, status=status.HTTP_400_BAD_REQUEST)

        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)
        
        if submission.status == 'submitted':
            return Response({'error': 'Exam already submitted'}, status=status.HTTP_400_BAD_REQUEST)

        log = ProctoringLog.objects.create(
            submission=submission,
            event_type='periodic_screenshot',
            details={},
            evidence=evidence
        )
        return Response({'message': 'Evidence uploaded successfully', 'url': log.evidence.url if log.evidence else None}, status=status.HTTP_201_CREATED)

class AudioUploadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        submission_id = request.data.get('submission_id')
        audio_file = request.FILES.get('audio')

        if not submission_id or not audio_file:
            return Response({'error': 'submission_id and audio are required'}, status=status.HTTP_400_BAD_REQUEST)

        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)

        recording, created = ExamAudioRecording.objects.update_or_create(
            submission=submission,
            defaults={'audio_file': audio_file}
        )
        return Response({
            'message': 'Full audio recording uploaded successfully',
            'id': str(recording.id),
            'audio_url': request.build_absolute_uri(recording.audio_file.url) if recording.audio_file else None
        }, status=status.HTTP_201_CREATED)

class ProctoringLogListView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        
        # Only the exam creator can view the logs
        if submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can view proctoring logs.")
            
        logs = submission.proctoring_logs.all().order_by('timestamp')
        serializer = ProctoringLogSerializer(logs, many=True)
        return Response(serializer.data)

class VideoUploadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        submission_id = request.data.get('submission_id')
        video_file = request.FILES.get('video')

        if not submission_id or not video_file:
            return Response({'error': 'submission_id and video are required'}, status=status.HTTP_400_BAD_REQUEST)

        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)

        recording, created = ExamVideoRecording.objects.update_or_create(
            submission=submission,
            defaults={'video_file': video_file}
        )

        return Response({
            'message': 'Video recording uploaded successfully',
            'id': str(recording.id),
            'video_url': request.build_absolute_uri(recording.video_file.url) if recording.video_file else None
        }, status=status.HTTP_201_CREATED)

class ExamVideoDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)

        if submission.exam.creator != request.user and submission.candidate != request.user:
            raise PermissionDenied("Only the exam creator or candidate can view the video recording.")

        recording = getattr(submission, 'video_recording', None)
        if not recording or not recording.video_file:
            return Response({'video_url': None})

        return Response({
            'id': str(recording.id),
            'video_url': request.build_absolute_uri(recording.video_file.url),
            'uploaded_at': recording.uploaded_at
        })

class ExamAudioDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)

        if submission.exam.creator != request.user and submission.candidate != request.user:
            raise PermissionDenied("Only the exam creator or candidate can view the audio recording.")

        recording = getattr(submission, 'full_audio_recording', None)
        if not recording or not recording.audio_file:
            return Response({'audio_url': None})

        return Response({
            'id': str(recording.id),
            'audio_url': request.build_absolute_uri(recording.audio_file.url),
            'uploaded_at': recording.uploaded_at
        })

class CandidateExamHistoryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        eligibilities = ExamEligibility.objects.filter(
            Q(candidate=request.user) | Q(email=request.user.email)
        ).select_related('exam').order_by('-exam__start_time')

        results = []
        seen_exam_ids = set()

        for eligibility in eligibilities:
            exam = eligibility.exam
            if not exam or exam.id in seen_exam_ids:
                continue
            seen_exam_ids.add(exam.id)

            if now < exam.start_time:
                computed_status = "upcoming"
            elif exam.start_time <= now <= exam.end_time:
                computed_status = "ongoing"
            else:
                computed_status = "completed"

            submission = Submission.objects.filter(exam=exam, candidate=request.user).first()

            results.append({
                "id": str(exam.id),
                "title": exam.title,
                "start_time": exam.start_time.isoformat(),
                "end_time": exam.end_time.isoformat(),
                "duration_minutes": exam.duration_minutes,
                "status": computed_status,
                "eligibility_status": eligibility.status,
                "submission_id": str(submission.id) if submission else None,
                "submission_status": submission.status if submission else None,
            })

        return Response({"results": results})


class DisputeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return self.request.user.raised_disputes.all()

    def get_serializer_class(self):
        from .serializers import DisputeSerializer
        return DisputeSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        disputes = self.get_queryset()
        serializer = self.get_serializer(disputes, many=True)
        return Response({"results": serializer.data})

    def create(self, request, *args, **kwargs):
        submission_id = request.data.get('submission_id')
        question_id = request.data.get('question_id')
        message = request.data.get('message')

        if not submission_id or not message:
            return Response({'error': 'submission_id and message are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            submission = Submission.objects.get(id=submission_id, candidate=request.user)
        except Submission.DoesNotExist:
            return Response({'error': 'Submission not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)
        
        if submission.status != 'evaluated':
            return Response({'error': 'Results must be evaluated before raising a dispute.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Dispute, Question
        question = None
        if question_id:
            try:
                question = Question.objects.get(id=question_id, exam=submission.exam)
            except Question.DoesNotExist:
                return Response({'error': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)

        dispute = Dispute.objects.create(
            submission=submission,
            question=question,
            raised_by=request.user,
            message=message
        )
        
        # Email examiner
        examiner_email = submission.exam.creator.email
        send_mail(
            subject=f"New Dispute Raised: {submission.exam.title}",
            message=f"A new dispute has been raised for {submission.exam.title} by {request.user.full_name}.\n\nMessage:\n{message}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[examiner_email],
            fail_silently=True,
        )

        from users.models import Notification
        Notification.objects.create(
            user=submission.exam.creator,
            title="New Dispute Raised",
            message=f"A new dispute has been raised for {submission.exam.title} by {request.user.full_name}.",
            link=f"/exams/{submission.exam.id}/disputes"
        )

        serializer = self.get_serializer(dispute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ExaminerDisputeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request, exam_pk=None):
        from .models import Exam, Dispute
        try:
            exam = Exam.objects.get(id=exam_pk, creator=request.user)
        except Exam.DoesNotExist:
            return Response({'error': 'Exam not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)
            
        disputes = Dispute.objects.filter(submission__exam=exam).order_by('-created_at')
        from .serializers import DisputeSerializer
        serializer = DisputeSerializer(disputes, many=True)
        return Response({"results": serializer.data})

    def partial_update(self, request, pk=None):
        from .models import Dispute
        try:
            dispute = Dispute.objects.get(id=pk)
        except Dispute.DoesNotExist:
            return Response({'error': 'Dispute not found.'}, status=status.HTTP_404_NOT_FOUND)

        if dispute.submission.exam.creator != request.user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        reply = request.data.get('reply')
        status_val = request.data.get('status')

        if reply is not None:
            dispute.reply = reply
            dispute.replied_by = request.user
            dispute.replied_at = timezone.now()
        
        if status_val is not None:
            dispute.status = status_val
            
        dispute.save()

        if reply is not None:
            candidate_email = dispute.raised_by.email
            send_mail(
                subject=f"Reply to your Dispute: {dispute.submission.exam.title}",
                message=f"The examiner has replied to your dispute for {dispute.submission.exam.title}.\n\nReply:\n{reply}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[candidate_email],
                fail_silently=True,
            )

            from users.models import Notification
            Notification.objects.create(
                user=dispute.raised_by,
                title="Dispute Replied",
                message=f"The examiner has replied to your dispute for {dispute.submission.exam.title}.",
                link="/my-disputes"
            )

        from .serializers import DisputeSerializer
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        from .models import Dispute
        try:
            dispute = Dispute.objects.get(id=pk)
        except Dispute.DoesNotExist:
            return Response({'error': 'Dispute not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if dispute.submission.exam.creator != request.user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        dispute.status = 'resolved'
        dispute.save()
        return Response({'status': 'resolved'})

class CandidateSubmissionDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)
        if submission.status != 'evaluated':
            raise PermissionDenied("Results are not yet published for this exam.")
        
        from .serializers import SubmissionEvaluationSerializer
        serializer = SubmissionEvaluationSerializer(submission)
        return Response(serializer.data)
