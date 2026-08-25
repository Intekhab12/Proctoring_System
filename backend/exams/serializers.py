from rest_framework import serializers
from .models import Exam, Question, ExamEligibility, Submission, Answer, ProctoringLog
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
        fields = ['id', 'question', 'text_answer', 'marks_awarded', 'feedback', 'created_at']
        read_only_fields = ['id', 'question', 'text_answer', 'created_at']

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
