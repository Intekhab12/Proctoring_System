from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Exam
from .utils import notify_candidate

@receiver(post_save, sender=Exam)
def send_invitations_on_publish(sender, instance, created, **kwargs):
    # If the exam is published, send emails to all pending eligibilities
    if instance.is_published:
        # We can add a simple check to not send them twice by checking if we have already sent them
        # However, for now, we just rely on the status='pending'
        pending_eligibilities = instance.eligibilities.filter(status='pending')
        
        for entry in pending_eligibilities:
            notify_candidate(instance, entry)
