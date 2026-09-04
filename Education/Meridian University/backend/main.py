import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from dotenv import load_dotenv

from email_service import send_apply_email, send_newsletter_email

load_dotenv()

app = FastAPI(title="Meridian API")

# Comma-separated list of frontend origins allowed to call this API.
# Set in .env, e.g. ALLOWED_ORIGINS=http://localhost:5500,https://meridian.com
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://127.0.0.1:5500,http://localhost:5500"
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
    # Hidden field, invisible to real users via CSS. If a bot fills it,
    # we silently drop the submission instead of emailing it.
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


@app.post("/api/apply")
async def apply(form: ApplyForm):
    if form.website:
        # Honeypot tripped — pretend success, send nothing.
        return {"status": "ok"}
    try:
        send_apply_email(form)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail="Could not send your application right now."
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
            status_code=500, detail="Could not subscribe right now."
        ) from exc
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}