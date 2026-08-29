from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    ExamViewSet, QuestionViewSet, ExamEligibilityViewSet,
    ExamRegistrationView, AvailableExamsView,
    ExamTakeView, SaveAnswerView, SubmitExamView,
    SubmissionDetailView, AnswerGradingView, PublishResultsView,
    SaveDraftGradesView, PublishAllResultsView,
    CandidateExamStatusView, ProctoringLogCreateView, ProctoringLogListView,
    ProctoringScreenshotUploadView, AudioUploadView, ExamAudioDetailView,
    VideoUploadView, ExamVideoDetailView,
    DisputeViewSet, ExaminerDisputeViewSet, CandidateSubmissionDetailView
)

router = DefaultRouter()
router.register(r'disputes', DisputeViewSet, basename='dispute')
router.register(r'', ExamViewSet, basename='exam')

question_list = QuestionViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
question_detail = QuestionViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})
question_bulk = QuestionViewSet.as_view({
    'post': 'bulk'
})

eligibility_list = ExamEligibilityViewSet.as_view({
    'get': 'list',
    'post': 'create'
})
eligibility_detail = ExamEligibilityViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})
eligibility_csv = ExamEligibilityViewSet.as_view({
    'post': 'csv'
})

urlpatterns = [
    # Nested resources
    path('<uuid:exam_pk>/questions/', question_list, name='exam-questions'),
    path('<uuid:exam_pk>/questions/bulk/', question_bulk, name='exam-questions-bulk'),
    path('<uuid:exam_pk>/questions/<uuid:pk>/', question_detail, name='exam-question-detail'),
    
    path('<uuid:exam_pk>/eligibility/', eligibility_list, name='exam-eligibility'),
    path('<uuid:exam_pk>/eligibility/csv/', eligibility_csv, name='exam-eligibility-csv'),
    path('<uuid:exam_pk>/eligibility/<uuid:pk>/', eligibility_detail, name='exam-eligibility-detail'),
    
    # Candidate routes
    path('candidate/exams/', views.CandidateExamHistoryView.as_view(), name='candidate-exams-history'),
    path('candidate/available-exams/', AvailableExamsView.as_view(), name='candidate-available-exams'),
    path('<uuid:exam_id>/candidate-status/', CandidateExamStatusView.as_view(), name='candidate-status'),
    path('<uuid:exam_id>/register/', ExamRegistrationView.as_view(), name='exam-register'),
    path('<uuid:exam_id>/take/', ExamTakeView.as_view(), name='exam-take'),
    path('submissions/<uuid:submission_id>/answers/', SaveAnswerView.as_view(), name='save-answer'),
    path('submissions/<uuid:submission_id>/submit/', SubmitExamView.as_view(), name='submit-exam'),
    path('submissions/<uuid:submission_id>/candidate-result/', CandidateSubmissionDetailView.as_view(), name='candidate-submission-result'),

    # Disputes routes
    path('<uuid:exam_pk>/disputes/', ExaminerDisputeViewSet.as_view({'get': 'list'}), name='exam-disputes'),
    path('disputes/<uuid:pk>/resolve/', ExaminerDisputeViewSet.as_view({'post': 'resolve'}), name='dispute-resolve'),
    path('disputes/<uuid:pk>/reply/', ExaminerDisputeViewSet.as_view({'patch': 'partial_update'}), name='dispute-reply'),
    
    # Proctoring routes
    path('proctoring/logs/', ProctoringLogCreateView.as_view(), name='proctoring-log-create'),
    path('proctoring/screenshot/', ProctoringScreenshotUploadView.as_view(), name='proctoring-screenshot-upload'),
    path('proctoring/audio/', AudioUploadView.as_view(), name='proctoring-audio-upload'),
    path('proctoring/video/', VideoUploadView.as_view(), name='proctoring-video-upload'),
    path('submissions/<uuid:submission_id>/logs/', ProctoringLogListView.as_view(), name='proctoring-log-list'),
    path('submissions/<uuid:submission_id>/audio/', ExamAudioDetailView.as_view(), name='submission-audio-detail'),
    path('submissions/<uuid:submission_id>/video/', ExamVideoDetailView.as_view(), name='submission-video-detail'),
    
    # Grading routes
    path('submissions/<uuid:submission_id>/', SubmissionDetailView.as_view(), name='submission-detail'),
    path('submissions/<uuid:submission_id>/save-grades/', SaveDraftGradesView.as_view(), name='submission-save-grades'),
    path('submissions/<uuid:submission_id>/publish/', PublishResultsView.as_view(), name='submission-publish'),
    path('<uuid:exam_id>/publish-all-results/', PublishAllResultsView.as_view(), name='exam-publish-all-results'),
    path('answers/<uuid:answer_id>/', AnswerGradingView.as_view(), name='answer-grade'),

    # Exam viewset (placed after nested to avoid URL matching conflicts with primary keys)
    path('', include(router.urls)),
]
