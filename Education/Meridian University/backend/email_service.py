import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
TO_EMAIL = os.getenv("TO_EMAIL", SMTP_USER)


def _send(subject: str, body: str) -> None:
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, TO_EMAIL]):
        raise RuntimeError("SMTP settings are missing — check your .env file")

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = TO_EMAIL
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, TO_EMAIL, msg.as_string())


def send_apply_email(form) -> None:
    body = (
        "New application received\n\n"
        f"Name: {form.name}\n"
        f"Email: {form.email}\n"
        f"Phone: {form.phone or '-'}\n"
        f"Position: {form.position or '-'}\n\n"
        f"Message:\n{form.message or '-'}\n"
    )
    _send(f"New Application: {form.name}", body)


def send_newsletter_email(form) -> None:
    body = f"New newsletter signup: {form.email}"
    _send("New Newsletter Signup", body)