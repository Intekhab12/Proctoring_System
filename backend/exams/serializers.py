from rest_framework import serializers
from .models import Exam, Question, ExamEligibility, Submission, Answer, ProctoringLog, Dispute
from users.models import User

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'image', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']

class ExamEligibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamEligibility
        fields = ['id', 'candidate', 'email', 'handle', 'invited_via', 'status']
        read_only_fields = ['id', 'candidate', 'invited_via', 'status']

class ExamSerializer(serializers.ModelSerializer):
    # questions = QuestionSerializer(many=True, read_only=True)
    # eligibilities_count = serializers.SerializerMethodField()

    class Meta:
        model = Exam
        fields = [
            'id', 'creator', 'title', 'description', 'guidelines',
            'duration_minutes', 'start_time', 'end_time', 
            'randomize_questions', 'is_published', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'is_published', 'created_at', 'updated_at']

    # def get_eligibilities_count(self, obj):
    #     return obj.eligibilities.count()

class CandidateSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']

class AnswerEvaluationSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = Answer
        fields = ['id', 'question', 'text_answer', 'whiteboard_data', 'marks_awarded', 'feedback', 'created_at']
        read_only_fields = ['id', 'question', 'text_answer', 'whiteboard_data', 'created_at']

class SubmissionEvaluationSerializer(serializers.ModelSerializer):
    candidate = CandidateSimpleSerializer(read_only=True)
    answers = AnswerEvaluationSerializer(many=True, read_only=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    
    class Meta:
        model = Submission
        fields = ['id', 'candidate', 'exam', 'exam_title', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at', 'answers']
        read_only_fields = ['id', 'candidate', 'exam', 'exam_title', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at', 'answers']

class ProctoringLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctoringLog
        fields = ['id', 'submission', 'event_type', 'details', 'timestamp', 'evidence', 'flagged']
        read_only_fields = ['id', 'timestamp']

class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True)
    replied_by_name = serializers.CharField(source='replied_by.full_name', read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    exam_title = serializers.CharField(source='submission.exam.title', read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id', 'submission', 'question', 'question_text', 'exam_title', 
            'raised_by', 'raised_by_name', 'message', 'reply', 
            'replied_by', 'replied_by_name', 'replied_at', 'status', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'raised_by', 'replied_by', 'replied_at', 'created_at', 'updated_at']
