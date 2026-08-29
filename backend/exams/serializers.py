from rest_framework import serializers
from .models import Exam, Question, ExamEligibility, Submission, Answer, ProctoringLog, Dispute, DisputeMessage
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

class SubmissionSerializer(serializers.ModelSerializer):
    candidate = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Submission
        fields = ['id', 'candidate', 'exam', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at']
        read_only_fields = ['id', 'candidate', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at']

class CandidateSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'profile_picture']

class AnswerEvaluationSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = Answer
        fields = ['id', 'question', 'text_answer', 'whiteboard_data', 'marks_awarded', 'feedback', 'created_at']
        read_only_fields = ['id', 'question', 'text_answer', 'whiteboard_data', 'created_at']

class SubmissionEvaluationSerializer(serializers.ModelSerializer):
    candidate = CandidateSimpleSerializer(read_only=True)
    answers = serializers.SerializerMethodField()
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    
    class Meta:
        model = Submission
        fields = ['id', 'candidate', 'exam', 'exam_title', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at', 'answers']
        read_only_fields = ['id', 'candidate', 'exam', 'exam_title', 'status', 'started_at', 'submitted_at', 'total_score', 'evaluated_at', 'answers']

    def get_answers(self, obj):
        answers = obj.answers.select_related('question').order_by('question__order', 'question__id')
        return AnswerEvaluationSerializer(answers, many=True, context=self.context).data

class ProctoringLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProctoringLog
        fields = ['id', 'submission', 'event_type', 'details', 'timestamp', 'evidence', 'flagged']
        read_only_fields = ['id', 'timestamp']

class DisputeMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    sender_profile_picture = serializers.SerializerMethodField()
    is_examiner = serializers.SerializerMethodField()

    class Meta:
        model = DisputeMessage
        fields = ['id', 'dispute', 'sender', 'sender_name', 'sender_email', 'sender_profile_picture', 'is_examiner', 'message', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_profile_picture(self, obj):
        if obj.sender.profile_picture:
            return obj.sender.profile_picture.url
        return None

    def get_is_examiner(self, obj):
        return obj.sender == obj.dispute.submission.exam.creator

class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.full_name', read_only=True)
    raised_by_email = serializers.CharField(source='raised_by.email', read_only=True)
    replied_by_name = serializers.CharField(source='replied_by.full_name', read_only=True)
    question_text = serializers.CharField(source='question.text', read_only=True)
    exam_title = serializers.CharField(source='submission.exam.title', read_only=True)
    exam_id = serializers.UUIDField(source='submission.exam.id', read_only=True)
    messages = serializers.SerializerMethodField()

    class Meta:
        model = Dispute
        fields = [
            'id', 'submission', 'exam_id', 'question', 'question_text', 'exam_title', 
            'raised_by', 'raised_by_name', 'raised_by_email', 'message', 'reply', 
            'replied_by', 'replied_by_name', 'replied_at', 'status', 'messages',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'raised_by', 'replied_by', 'replied_at', 'created_at', 'updated_at']

    def get_messages(self, obj):
        msgs = obj.messages.all().order_by('created_at')
        if not msgs.exists():
            virtual_msgs = []
            if obj.message:
                virtual_msgs.append({
                    'id': str(obj.id) + '-init',
                    'dispute': str(obj.id),
                    'sender': obj.raised_by.id,
                    'sender_name': obj.raised_by.full_name or obj.raised_by.email,
                    'sender_email': obj.raised_by.email,
                    'sender_profile_picture': obj.raised_by.profile_picture.url if obj.raised_by.profile_picture else None,
                    'is_examiner': False,
                    'message': obj.message,
                    'created_at': obj.created_at
                })
            if obj.reply and obj.replied_by:
                virtual_msgs.append({
                    'id': str(obj.id) + '-rep',
                    'dispute': str(obj.id),
                    'sender': obj.replied_by.id,
                    'sender_name': obj.replied_by.full_name or obj.replied_by.email,
                    'sender_email': obj.replied_by.email,
                    'sender_profile_picture': obj.replied_by.profile_picture.url if obj.replied_by.profile_picture else None,
                    'is_examiner': True,
                    'message': obj.reply,
                    'created_at': obj.replied_at or obj.updated_at
                })
            return virtual_msgs
        return DisputeMessageSerializer(msgs, many=True).data
