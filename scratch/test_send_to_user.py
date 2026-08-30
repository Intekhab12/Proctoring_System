import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Hello Intekhab! This is a test OTP from ProctorBuddy: 123456. It is valid for 10 minutes.')
msg['Subject'] = 'Password Reset OTP - ProctorBuddy'
msg['From'] = 'ProctorBuddy <proctorbud76@gmail.com>'
msg['To'] = 'inte4071@gmail.com'

try:
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('proctorbud76@gmail.com', 'gnmmqtvnsiavpjkx')
        server.send_message(msg)
    print("SUCCESS: Sent live email to inte4071@gmail.com!")
except Exception as e:
    print("ERROR:", e)
