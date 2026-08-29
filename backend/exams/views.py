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
from django.contrib.auth import get_user_model
User = get_user_model()
from .permissions import IsExaminer, IsExamCreator, IsCandidate
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
        
        # Check if email belongs to an examiner
        if User.objects.filter(email=email, is_examiner=True).exists():
            return Response({'error': 'Cannot add an examiner as a candidate.'}, status=status.HTTP_400_BAD_REQUEST)
        
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
                        # Skip examiners
                        if User.objects.filter(email=email, is_examiner=True).exists():
                            continue
                            
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
    permission_classes = [IsAuthenticated, IsCandidate]

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
    permission_classes = [IsAuthenticated, IsCandidate]

    def get(self, request):
        user = request.user
        
        # Get all eligibilities for this user that are 'pending' or 'registered'
        # We also need to join the exam table to filter by is_published=True
        # and maybe time window, but let's just return what they are eligible for.
        now = timezone.now()
        
        # Pending registration (must be published and not expired)
        pending_eligibilities = ExamEligibility.objects.filter(
            email=user.email,
            status='pending',
            exam__is_published=True,
            exam__end_time__gt=now
        ).select_related('exam')
        
        # Registered tests that are not expired and not already submitted
        submitted_exam_ids = Submission.objects.filter(
            candidate=user,
            status__in=['submitted', 'evaluated']
        ).values_list('exam_id', flat=True)
        
        registered_eligibilities = ExamEligibility.objects.filter(
            email=user.email,
            status='registered',
            exam__is_published=True,
            exam__end_time__gt=now
        ).exclude(exam_id__in=submitted_exam_ids).select_related('exam')
        
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
    permission_classes = [IsAuthenticated, IsCandidate]

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
                'description': exam.description,
                'is_published': exam.is_published
            },
            'is_eligible': eligibility is not None,
            'status': eligibility.status if eligibility else None,
        }
        
        return Response(status_info)

def ensure_all_answers_exist(submission):
    """
    Guarantees that an Answer object exists for every Question in the exam,
    preserving empty text answers and empty whiteboard drawings so questions
    are never omitted in grading, submission, or result views.
    """
    for q in submission.exam.questions.all().order_by('order', 'id'):
        Answer.objects.get_or_create(
            submission=submission,
            question=q,
            defaults={
                'text_answer': '',
                'whiteboard_data': None,
            }
        )

class ExamTakeView(views.APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

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
        
        ensure_all_answers_exist(submission)
        
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
                'description': exam.description,
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
    permission_classes = [IsAuthenticated, IsCandidate]

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
    permission_classes = [IsAuthenticated, IsCandidate]

    def post(self, request, submission_id):
        try:
            submission = Submission.objects.get(id=submission_id, candidate=request.user)
        except Submission.DoesNotExist:
            raise PermissionDenied("Submission not found.")

        ensure_all_answers_exist(submission)

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
        
        ensure_all_answers_exist(submission)
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
        
        if marks is not None and marks != '':
            answer.marks_awarded = int(marks)
        elif marks == '':
            answer.marks_awarded = None
            
        if feedback is not None:
            answer.feedback = feedback
            
        answer.save()

        # Recalculate total_score
        total_marks = answer.submission.answers.aggregate(Sum('marks_awarded'))['marks_awarded__sum']
        answer.submission.total_score = total_marks or 0
        answer.submission.save(update_fields=['total_score'])

        return Response({
            'message': 'Grading updated successfully',
            'total_score': answer.submission.total_score
        })

class SaveDraftGradesView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        if submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can grade this submission.")
        
        ensure_all_answers_exist(submission)

        answers_data = request.data.get('answers')
        if answers_data:
            if isinstance(answers_data, list):
                for item in answers_data:
                    a_id = item.get('id')
                    marks = item.get('marks_awarded')
                    feedback = item.get('feedback')
                    if a_id:
                        ans = submission.answers.filter(id=a_id).first()
                        if ans:
                            if marks is not None and marks != '':
                                ans.marks_awarded = int(marks)
                            elif marks == '':
                                ans.marks_awarded = None
                            if feedback is not None:
                                ans.feedback = feedback
                            ans.save()
            elif isinstance(answers_data, dict):
                for a_id, item in answers_data.items():
                    ans = submission.answers.filter(id=a_id).first()
                    if ans:
                        marks = item.get('marks_awarded')
                        feedback = item.get('feedback')
                        if marks is not None and marks != '':
                            ans.marks_awarded = int(marks)
                        elif marks == '':
                            ans.marks_awarded = None
                        if feedback is not None:
                            ans.feedback = feedback
                        ans.save()

        # Recalculate total score
        total_marks = submission.answers.aggregate(Sum('marks_awarded'))['marks_awarded__sum']
        submission.total_score = total_marks or 0
        submission.save(update_fields=['total_score'])

        return Response({
            'message': 'Draft marks saved successfully. You can publish to all candidates together from the Submissions list.',
            'total_score': submission.total_score,
            'status': submission.status
        })

class PublishResultsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id)
        if submission.exam.creator != request.user:
            raise PermissionDenied("Only the exam creator can publish these results.")
        
        ensure_all_answers_exist(submission)

        # Save any updated answers passed in payload
        answers_data = request.data.get('answers')
        if answers_data:
            if isinstance(answers_data, list):
                for item in answers_data:
                    a_id = item.get('id')
                    marks = item.get('marks_awarded')
                    feedback = item.get('feedback')
                    if a_id:
                        ans = submission.answers.filter(id=a_id).first()
                        if ans:
                            if marks is not None and marks != '':
                                ans.marks_awarded = int(marks)
                            elif marks == '':
                                ans.marks_awarded = None
                            if feedback is not None:
                                ans.feedback = feedback
                            ans.save()
            elif isinstance(answers_data, dict):
                for a_id, item in answers_data.items():
                    ans = submission.answers.filter(id=a_id).first()
                    if ans:
                        marks = item.get('marks_awarded')
                        feedback = item.get('feedback')
                        if marks is not None and marks != '':
                            ans.marks_awarded = int(marks)
                        elif marks == '':
                            ans.marks_awarded = None
                        if feedback is not None:
                            ans.feedback = feedback
                        ans.save()

        was_already_evaluated = submission.status == 'evaluated'

        # Calculate total score
        total_marks = submission.answers.aggregate(Sum('marks_awarded'))['marks_awarded__sum']
        submission.total_score = total_marks or 0
        submission.status = 'evaluated'
        submission.evaluated_at = timezone.now()
        submission.save()
        
        # Send email notification
        action_verb = "Updated" if was_already_evaluated else "Published"
        candidate_email = submission.candidate.email
        send_mail(
            subject=f"Results {action_verb}: {submission.exam.title}",
            message=f"Hi {submission.candidate.full_name or 'Candidate'},\n\n"
                    f"Your results for {submission.exam.title} have been {action_verb.lower()}.\n"
                    f"Please log in to your dashboard and view your results in the My Tests section.\n\n"
                    f"Total Score: {submission.total_score}\n\n"
                    f"Thank you,\nProctorBuddy Team",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[candidate_email],
            fail_silently=True,
        )

        # In-app notification
        from users.models import Notification
        Notification.objects.create(
            user=submission.candidate,
            title=f"Results {action_verb}",
            message=f"Your results for {submission.exam.title} have been {action_verb.lower()}. Total Score: {submission.total_score}. Check 'My Tests' for details.",
            link=f"/candidate-results/{submission.id}"
        )
        
        return Response({
            'message': f'Results {action_verb.lower()} successfully.',
            'total_score': submission.total_score
        })

class PublishAllResultsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, exam_id):
        exam = get_object_or_404(Exam, id=exam_id, creator=request.user)
        submissions = Submission.objects.filter(exam=exam, status__in=['submitted', 'evaluated'])

        count = 0
        now = timezone.now()
        for submission in submissions:
            ensure_all_answers_exist(submission)
            total_marks = submission.answers.aggregate(Sum('marks_awarded'))['marks_awarded__sum']
            submission.total_score = total_marks or 0
            was_already_evaluated = submission.status == 'evaluated'
            submission.status = 'evaluated'
            submission.evaluated_at = now
            submission.save()
            count += 1

            # Dispatch notification to candidate
            candidate_email = submission.candidate.email
            action_verb = "Updated" if was_already_evaluated else "Published"
            send_mail(
                subject=f"Results {action_verb}: {exam.title}",
                message=f"Hi {submission.candidate.full_name or 'Candidate'},\n\n"
                        f"Your results for {exam.title} have been {action_verb.lower()}.\n"
                        f"Please log in to your dashboard and view your results in the My Tests section.\n\n"
                        f"Total Score: {submission.total_score}\n\n"
                        f"Thank you,\nProctorBuddy Team",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[candidate_email],
                fail_silently=True,
            )

            from users.models import Notification
            Notification.objects.create(
                user=submission.candidate,
                title=f"Results {action_verb}: {exam.title}",
                message=f"Your results for {exam.title} have been {action_verb.lower()}. Total Score: {submission.total_score}. Check 'My Tests' for details.",
                link=f"/candidate-results/{submission.id}"
            )

        return Response({
            'message': f'Successfully published results to {count} candidate(s)!',
            'count': count
        })

class ProctoringLogCreateView(views.APIView):
    permission_classes = [IsAuthenticated, IsCandidate]

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
    permission_classes = [IsAuthenticated, IsCandidate]

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
    permission_classes = [IsAuthenticated, IsCandidate]
    
    def post(self, request):
        submission_id = request.data.get('submission_id')
        audio_file = request.FILES.get('audio')
        
        if not submission_id or not audio_file:
            return Response({'error': 'Missing submission_id or audio file'}, status=status.HTTP_400_BAD_REQUEST)
            
        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)
        
        # We append rather than overwrite since chunks come in periodically
        recording = ExamAudioRecording(
            submission=submission,
            audio_file=audio_file
        )
        recording.save()
        
        return Response({'message': 'Audio uploaded successfully'}, status=status.HTTP_201_CREATED)

class ProctoringLogListView(views.APIView):
    permission_classes = [IsAuthenticated, IsExaminer]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id, exam__creator=request.user)
        logs = ProctoringLog.objects.filter(submission=submission).order_by('-timestamp')
        serializer = ProctoringLogSerializer(logs, many=True)
        return Response(serializer.data)

class VideoUploadView(views.APIView):
    permission_classes = [IsAuthenticated, IsCandidate]
    
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
        from .models import Dispute
        from django.db.models import Q
        user = self.request.user
        return Dispute.objects.filter(Q(raised_by=user) | Q(submission__exam__creator=user)).distinct()

    def get_serializer_class(self):
        from .serializers import DisputeSerializer
        return DisputeSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        from .models import Dispute
        disputes = Dispute.objects.filter(raised_by=request.user).order_by('-created_at')
        serializer = self.get_serializer(disputes, many=True)
        return Response({"results": serializer.data})

    def create(self, request, *args, **kwargs):
        submission_id = request.data.get('submission_id')
        question_id = request.data.get('question_id')
        message = request.data.get('message', '').strip()

        if not submission_id or not message:
            return Response({'error': 'submission_id and message are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            submission = Submission.objects.get(id=submission_id, candidate=request.user)
        except Submission.DoesNotExist:
            return Response({'error': 'Submission not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)
        
        if submission.status != 'evaluated':
            return Response({'error': 'Results must be evaluated before raising a dispute.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import Dispute, Question, DisputeMessage
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

        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
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
            link=f"/exams/{submission.exam.id}"
        )

        serializer = self.get_serializer(dispute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        dispute = self.get_object()
        from .models import DisputeMessage
        from .serializers import DisputeMessageSerializer, DisputeSerializer

        if request.method == 'GET':
            msgs = dispute.messages.all().order_by('created_at')
            return Response(DisputeMessageSerializer(msgs, many=True).data)

        msg_text = request.data.get('message', '').strip()
        if not msg_text:
            return Response({'error': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        new_msg = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=msg_text
        )

        is_examiner = (request.user == dispute.submission.exam.creator)
        if is_examiner:
            dispute.reply = msg_text
            dispute.replied_by = request.user
            dispute.replied_at = timezone.now()
            if dispute.status == 'open':
                dispute.status = 'in_progress'
            dispute.save()

            from users.models import Notification
            Notification.objects.create(
                user=dispute.raised_by,
                title="New Dispute Message from Examiner",
                message=f"The examiner replied to your dispute for {dispute.submission.exam.title}.",
                link="/my-disputes"
            )
            send_mail(
                subject=f"New Reply on Dispute: {dispute.submission.exam.title}",
                message=f"The examiner sent a reply to your dispute for {dispute.submission.exam.title}.\n\nMessage:\n{msg_text}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[dispute.raised_by.email],
                fail_silently=True,
            )
        else:
            if dispute.status == 'resolved':
                dispute.status = 'in_progress'
            dispute.save()

            from users.models import Notification
            Notification.objects.create(
                user=dispute.submission.exam.creator,
                title="New Dispute Message from Candidate",
                message=f"{request.user.full_name} sent a follow-up on dispute for {dispute.submission.exam.title}.",
                link=f"/exams/{dispute.submission.exam.id}"
            )
            send_mail(
                subject=f"Candidate Message on Dispute: {dispute.submission.exam.title}",
                message=f"{request.user.full_name} sent a message regarding the dispute for {dispute.submission.exam.title}.\n\nMessage:\n{msg_text}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[dispute.submission.exam.creator.email],
                fail_silently=True,
            )

        return Response({
            'message': DisputeMessageSerializer(new_msg).data,
            'dispute': DisputeSerializer(dispute).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'patch'], url_path='status')
    def status_update(self, request, pk=None):
        dispute = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ['open', 'in_progress', 'resolved', 'closed']:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        dispute.status = new_status
        dispute.save()

        # Send in-app notification about status change
        is_examiner = (request.user == dispute.submission.exam.creator)
        target_user = dispute.raised_by if is_examiner else dispute.submission.exam.creator
        target_link = "/my-disputes" if is_examiner else f"/exams/{dispute.submission.exam.id}"
        from users.models import Notification
        Notification.objects.create(
            user=target_user,
            title="Dispute Status Updated",
            message=f"Dispute for {dispute.submission.exam.title} marked as '{new_status.replace('_', ' ').title()}'.",
            link=target_link
        )

        from .serializers import DisputeSerializer
        return Response(DisputeSerializer(dispute).data)

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
        from .models import Dispute, DisputeMessage
        try:
            dispute = Dispute.objects.get(id=pk)
        except Dispute.DoesNotExist:
            return Response({'error': 'Dispute not found.'}, status=status.HTTP_404_NOT_FOUND)

        if dispute.submission.exam.creator != request.user:
            return Response({'error': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        reply = request.data.get('reply')
        status_val = request.data.get('status')

        if reply is not None and reply.strip():
            dispute.reply = reply
            dispute.replied_by = request.user
            dispute.replied_at = timezone.now()
            if not status_val and dispute.status == 'open':
                dispute.status = 'in_progress'
            DisputeMessage.objects.create(
                dispute=dispute,
                sender=request.user,
                message=reply.strip()
            )
        
        if status_val is not None:
            dispute.status = status_val
            
        dispute.save()

        if reply is not None and reply.strip():
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

        from users.models import Notification
        Notification.objects.create(
            user=dispute.raised_by,
            title="Dispute Resolved",
            message=f"The examiner marked your dispute for {dispute.submission.exam.title} as resolved.",
            link="/my-disputes"
        )
        return Response({'status': 'resolved'})

class CandidateSubmissionDetailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, id=submission_id, candidate=request.user)
        if submission.status != 'evaluated':
            raise PermissionDenied("Results are not yet published for this exam.")
        
        ensure_all_answers_exist(submission)
        from .serializers import SubmissionEvaluationSerializer
        serializer = SubmissionEvaluationSerializer(submission)
        return Response(serializer.data)
