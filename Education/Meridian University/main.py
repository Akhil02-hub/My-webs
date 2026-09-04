import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, field_validator
from dotenv import load_dotenv

from email_service import send_apply_email, send_newsletter_email

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
INDEX_FILE = FRONTEND_DIR / "index.html"

app = FastAPI(title="Meridian API")

# CORS
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "*"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ApplyForm(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    position: Optional[str] = None
    message: Optional[str] = None
    website: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class NewsletterForm(BaseModel):
    email: EmailStr
    website: Optional[str] = ""


# =========================
# FRONTEND
# =========================

@app.get("/")
async def serve_home():
    return FileResponse(INDEX_FILE)


# =========================
# API
# =========================

@app.post("/api/apply")
async def apply(form: ApplyForm):
    if form.website:
        return {"status": "ok"}

    try:
        send_apply_email(form)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not send your application right now."
        ) from exc

    return {"status": "ok"}


@app.post("/api/newsletter")
async def newsletter(form: NewsletterForm):
    if form.website:
        return {"status": "ok"}

    try:
        send_newsletter_email(form)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not subscribe right now."
        ) from exc

    return {"status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}