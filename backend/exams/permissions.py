from rest_framework import permissions

class IsExaminer(permissions.BasePermission):
    """
    Custom permission to only allow examiners to create or modify exams.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

class IsExamCreator(permissions.BasePermission):
    """
    Custom permission to only allow the creator of an exam to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Exam model
        if hasattr(obj, 'creator'):
            return obj.creator == request.user
        # Nested models like Question or ExamEligibility
        if hasattr(obj, 'exam'):
            return obj.exam.creator == request.user
        return False
