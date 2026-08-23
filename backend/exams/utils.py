from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

def send_exam_invitation(exam, entry):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    register_link = f"{frontend_url}/exam/register/{exam.id}?email={entry.email}"
    
    context = {
        'handle': entry.handle or entry.email.split('@')[0],
        'exam_title': exam.title,
        'start_time': exam.start_time,
        'end_time': exam.end_time,
        'duration': exam.duration_minutes,
        'register_link': register_link,
    }
    
    html_content = render_to_string('emails/exam_invitation.html', context)
    text_content = f"""
    Hello {context['handle']},
    
    You have been invited to take the exam: {exam.title}.
    
    Start Window: {exam.start_time} to {exam.end_time}
    Duration: {exam.duration_minutes} minutes
    
    Please click the link below to register and confirm your participation:
    {register_link}
    
    If you don't have an account yet, you will be asked to create one using this email.
    
    Regards,
    Exam Team
    """
    
    msg = EmailMultiAlternatives(
        subject=f"You're invited to {exam.title}",
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@example.com',
        to=[entry.email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()

def notify_candidate(exam, entry):
    from django.contrib.auth import get_user_model
    from users.models import Notification
    
    User = get_user_model()
    try:
        send_exam_invitation(exam, entry)
    except Exception as e:
        print(f"Failed to send email to {entry.email}: {e}")

    try:
        user = User.objects.filter(email=entry.email).first()
        if user:
            Notification.objects.create(
                user=user,
                title="New Exam Invitation",
                message=f"You have been invited to take the exam: {exam.title}.",
                link=f"/exam/register/{exam.id}"
            )
    except Exception as e:
        print(f"Failed to create notification for {entry.email}: {e}")
