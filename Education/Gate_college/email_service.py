import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def _send_email(subject: str, body: str, reply_to: Optional[str] = None) -> None:
    host = _required("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    username = _required("SMTP_USERNAME")
    password = _required("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", username)
    recipient = _required("CONTACT_EMAIL")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body)

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.ehlo()
        if port == 587:
            smtp.starttls()
            smtp.ehlo()
        smtp.login(username, password)
        smtp.send_message(msg)


def send_admission_email(form) -> None:
    body = (
        "New GATE Kodad admission enquiry\n\n"
        f"First name: {form.first_name}\n"
        f"Last name: {form.last_name}\n"
        f"Email: {form.email}\n"
        f"Phone: {form.phone or 'Not provided'}\n"
        f"Program: {form.program}\n"
    )
    _send_email(
        f"GATE Kodad Enquiry — {form.first_name} {form.last_name}",
        body,
        str(form.email),
    )


def send_newsletter_email(form) -> None:
    _send_email(
        "New GATE Kodad Newsletter Subscriber",
        f"New subscriber email: {form.email}\n",
        str(form.email),
    )
