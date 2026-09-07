import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, field_validator

from email_service import send_admission_email, send_newsletter_email

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
INDEX_FILE = BASE_DIR / "frontend" / "index.html"

app = FastAPI(title="GATE Kodad API")

origins = [v.strip() for v in os.getenv("ALLOWED_ORIGINS", "*").split(",") if v.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class AdmissionForm(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    program: str
    website: Optional[str] = ""

    @field_validator("first_name", "last_name", "program")
    @classmethod
    def required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required.")
        return value


class NewsletterForm(BaseModel):
    email: EmailStr
    website: Optional[str] = ""


@app.get("/")
async def home():
    if not INDEX_FILE.exists():
        raise HTTPException(status_code=500, detail="frontend/index.html not found")
    return FileResponse(INDEX_FILE)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/admission")
async def admission(form: AdmissionForm):
    if form.website:
        return {"status": "ok", "message": "Enquiry received."}
    try:
        send_admission_email(form)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not send your enquiry right now.") from exc
    return {"status": "ok", "message": "Enquiry sent successfully. The admissions team can contact you soon."}


@app.post("/api/newsletter")
async def newsletter(form: NewsletterForm):
    if form.website:
        return {"status": "ok", "message": "Subscription received."}
    try:
        send_newsletter_email(form)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not subscribe right now.") from exc
    return {"status": "ok", "message": "Newsletter subscription received."}
