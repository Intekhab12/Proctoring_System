from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

from django.http import JsonResponse
from exams.views import CandidateExamHistoryView

def health_check(request):
    return JsonResponse({
        "status": "online",
        "service": "ProctorBuddy Backend API",
        "message": "API Server is running smoothly!"
    })

urlpatterns = [
    path('', health_check, name='api-health'),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/candidate/exams/', CandidateExamHistoryView.as_view(), name='candidate-exams-direct'),
    path('api/exams/', include('exams.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
