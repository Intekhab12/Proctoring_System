import smtplib
from email.mime.text import MIMEText

msg = MIMEText('This is a test verification email from ProctorBuddy!')
msg['Subject'] = 'ProctorBuddy Live SMTP Verification'
msg['From'] = 'ProctorBuddy <proctorbud76@gmail.com>'
msg['To'] = 'proctorbud76@gmail.com'

try:
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('proctorbud76@gmail.com', 'gnmmqtvnsiavpjkx')
        server.send_message(msg)
    print("SUCCESS: Connected to Gmail SMTP and sent test email!")
except Exception as e:
    print("ERROR:", e)
