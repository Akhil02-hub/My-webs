import os
import sqlite3
import hashlib
import secrets
import shutil
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
UPLOADS_DIR = FRONTEND_DIR / "uploads"
DB_PATH = BASE_DIR / "studio.db"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ChangeMe123!")

app = FastAPI(title="Design Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS invitations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('static','animated')),
            price TEXT DEFAULT '',
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            preview_url TEXT DEFAULT '',
            purchase_link TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS websites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT DEFAULT '',
            video_url TEXT DEFAULT '',
            live_url TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            comment TEXT DEFAULT '',
            approved INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS project_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            project_type TEXT DEFAULT '',
            budget TEXT DEFAULT '',
            message TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            created_at TEXT DEFAULT (datetime('now'))
        );
        """
    )

    defaults = {
        "admin_password_hash": hash_password(DEFAULT_ADMIN_PASSWORD),
        "site_logo": "/uploads/default-logo.svg",
        "site_name": "Atelier & Co.",
        "hero_headline": "Invitations and websites, designed like keepsakes.",
        "hero_subheadline": "Every card, every page, made to be kept.",
        "invitation_quote": "Every invitation starts with your story. Tell us the occasion and we'll shape a quote around it \u2014 from a single printed card to a fully animated digital suite.",
        "website_quote": "Your website should feel like your studio, not a template. Share what you're building and we'll scope a site that fits the brief, the budget, and the timeline.",
        "instagram_url": "https://instagram.com/",
        "contact_email": "hello@example.com",
    }
    for key, value in defaults.items():
        cur.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value)
        )

    cur.execute("SELECT COUNT(*) AS c FROM invitations")
    if cur.fetchone()["c"] == 0:
        cur.executemany(
            """INSERT INTO invitations (title, type, price, description, image_url, preview_url, purchase_link, sort_order)
               VALUES (?,?,?,?,?,?,?,?)""",
            [
                (
                    "Ivory Botanical",
                    "static",
                    "\u20b91,200",
                    "A single printed card with pressed-botanical linework, letterpress finish, envelope included.",
                    "/uploads/sample-static-1.svg",
                    "/uploads/sample-static-1.svg",
                    "https://instagram.com/",
                    1,
                ),
                (
                    "Midnight Monogram",
                    "static",
                    "\u20b91,450",
                    "Foil monogram on deep ink card stock, for evening weddings and formal occasions.",
                    "/uploads/sample-static-2.svg",
                    "/uploads/sample-static-2.svg",
                    "https://instagram.com/",
                    2,
                ),
                (
                    "Gilded Bloom Motion",
                    "animated",
                    "\u20b92,900",
                    "Petals unfold around your names as the card opens \u2014 a looping animated invitation for digital sends.",
                    "/uploads/sample-animated-1.svg",
                    "/uploads/sample-animated-1.svg",
                    "https://example.com/animated-code/gilded-bloom",
                    1,
                ),
                (
                    "Confetti Reveal",
                    "animated",
                    "\u20b93,200",
                    "A playful confetti-burst reveal, built for birthdays and celebrations sent over WhatsApp or email.",
                    "/uploads/sample-animated-2.svg",
                    "/uploads/sample-animated-2.svg",
                    "https://example.com/animated-code/confetti-reveal",
                    2,
                ),
            ],
        )

    cur.execute("SELECT COUNT(*) AS c FROM websites")
    if cur.fetchone()["c"] == 0:
        cur.executemany(
            """INSERT INTO websites (title, category, description, video_url, live_url, sort_order)
               VALUES (?,?,?,?,?,?)""",
            [
                (
                    "Marlowe & Finch",
                    "Portfolio",
                    "A photographer's portfolio with a full-bleed gallery and slow-motion scroll.",
                    "/uploads/sample-website-1.mp4",
                    "https://example.com",
                    1,
                ),
                (
                    "Kettle & Co.",
                    "E-commerce",
                    "A small-batch tea shop storefront with a hand-drawn product grid.",
                    "/uploads/sample-website-2.mp4",
                    "https://example.com",
                    2,
                ),
                (
                    "The Wren Report",
                    "Editorial",
                    "A weekly newsletter site with an archive and a reading-time indicator.",
                    "/uploads/sample-website-3.mp4",
                    "https://example.com",
                    3,
                ),
            ],
        )

    conn.commit()
    conn.close()


init_db()

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

_active_tokens: set[str] = set()


def get_setting(key: str, default: str = "") -> str:
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


def require_admin(x_admin_token: Optional[str] = Header(None)):
    if not x_admin_token or x_admin_token not in _active_tokens:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return True


class LoginBody(BaseModel):
    password: str


@app.post("/api/admin/login")
def admin_login(body: LoginBody):
    stored_hash = get_setting("admin_password_hash")
    if hash_password(body.password) != stored_hash:
        raise HTTPException(status_code=401, detail="Incorrect password")
    token = secrets.token_hex(24)
    _active_tokens.add(token)
    return {"token": token}


@app.post("/api/admin/logout")
def admin_logout(x_admin_token: Optional[str] = Header(None)):
    _active_tokens.discard(x_admin_token)
    return {"ok": True}


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


@app.post("/api/admin/change-password")
def change_password(body: ChangePasswordBody, _: bool = Depends(require_admin)):
    stored_hash = get_setting("admin_password_hash")
    if hash_password(body.current_password) != stored_hash:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    conn = get_db()
    conn.execute(
        "UPDATE settings SET value = ? WHERE key = 'admin_password_hash'",
        (hash_password(body.new_password),),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


@app.get("/api/settings")
def list_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    data = {r["key"]: r["value"] for r in rows}
    data.pop("admin_password_hash", None)
    return data


class SettingsUpdate(BaseModel):
    values: dict


@app.put("/api/settings")
def update_settings(body: SettingsUpdate, _: bool = Depends(require_admin)):
    conn = get_db()
    for key, value in body.values.items():
        if key == "admin_password_hash":
            continue
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, str(value)),
        )
    conn.commit()
    conn.close()
    return list_settings()


# ---------------------------------------------------------------------------
# Invitations CRUD
# ---------------------------------------------------------------------------


class InvitationIn(BaseModel):
    title: str
    type: str
    price: str = ""
    description: str = ""
    image_url: str = ""
    preview_url: str = ""
    purchase_link: str = ""
    sort_order: int = 0


@app.get("/api/invitations")
def list_invitations(type: Optional[str] = None):
    conn = get_db()
    if type:
        rows = conn.execute(
            "SELECT * FROM invitations WHERE type = ? ORDER BY sort_order, id", (type,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM invitations ORDER BY sort_order, id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/invitations")
def create_invitation(body: InvitationIn, _: bool = Depends(require_admin)):
    if body.type not in ("static", "animated"):
        raise HTTPException(400, "type must be 'static' or 'animated'")
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO invitations (title,type,price,description,image_url,preview_url,purchase_link,sort_order)
           VALUES (?,?,?,?,?,?,?,?)""",
        (
            body.title,
            body.type,
            body.price,
            body.description,
            body.image_url,
            body.preview_url,
            body.purchase_link,
            body.sort_order,
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM invitations WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/invitations/{item_id}")
def update_invitation(item_id: int, body: InvitationIn, _: bool = Depends(require_admin)):
    conn = get_db()
    existing = conn.execute("SELECT id FROM invitations WHERE id = ?", (item_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Invitation not found")
    conn.execute(
        """UPDATE invitations SET title=?, type=?, price=?, description=?, image_url=?,
           preview_url=?, purchase_link=?, sort_order=? WHERE id = ?""",
        (
            body.title,
            body.type,
            body.price,
            body.description,
            body.image_url,
            body.preview_url,
            body.purchase_link,
            body.sort_order,
            item_id,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM invitations WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/invitations/{item_id}")
def delete_invitation(item_id: int, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("DELETE FROM invitations WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Websites CRUD
# ---------------------------------------------------------------------------


class WebsiteIn(BaseModel):
    title: str
    category: str
    description: str = ""
    video_url: str = ""
    live_url: str = ""
    sort_order: int = 0


@app.get("/api/websites")
def list_websites(category: Optional[str] = None):
    conn = get_db()
    if category:
        rows = conn.execute(
            "SELECT * FROM websites WHERE category = ? ORDER BY sort_order, id", (category,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM websites ORDER BY sort_order, id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/websites/categories")
def list_website_categories():
    conn = get_db()
    rows = conn.execute(
        "SELECT DISTINCT category FROM websites ORDER BY category"
    ).fetchall()
    conn.close()
    return [r["category"] for r in rows]


@app.post("/api/websites")
def create_website(body: WebsiteIn, _: bool = Depends(require_admin)):
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO websites (title,category,description,video_url,live_url,sort_order)
           VALUES (?,?,?,?,?,?)""",
        (body.title, body.category, body.description, body.video_url, body.live_url, body.sort_order),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM websites WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/websites/{item_id}")
def update_website(item_id: int, body: WebsiteIn, _: bool = Depends(require_admin)):
    conn = get_db()
    existing = conn.execute("SELECT id FROM websites WHERE id = ?", (item_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(404, "Website not found")
    conn.execute(
        """UPDATE websites SET title=?, category=?, description=?, video_url=?, live_url=?, sort_order=?
           WHERE id = ?""",
        (body.title, body.category, body.description, body.video_url, body.live_url, body.sort_order, item_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM websites WHERE id = ?", (item_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/websites/{item_id}")
def delete_website(item_id: int, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("DELETE FROM websites WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------


class ReviewIn(BaseModel):
    name: str
    rating: int
    comment: str = ""


@app.get("/api/reviews")
def list_reviews(all: bool = False, _admin: Optional[str] = Header(None, alias="X-Admin-Token")):
    conn = get_db()
    if all and _admin in _active_tokens:
        rows = conn.execute("SELECT * FROM reviews ORDER BY created_at DESC").fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC"
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/reviews")
def create_review(body: ReviewIn):
    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "rating must be between 1 and 5")
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO reviews (name, rating, comment, approved) VALUES (?,?,?,0)",
        (body.name, body.rating, body.comment),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM reviews WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/reviews/{item_id}/approve")
def approve_review(item_id: int, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("UPDATE reviews SET approved = 1 WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/api/reviews/{item_id}")
def delete_review(item_id: int, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("DELETE FROM reviews WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Project requests ("Do a Project")
# ---------------------------------------------------------------------------


class ProjectRequestIn(BaseModel):
    name: str
    email: str
    project_type: str = ""
    budget: str = ""
    message: str = ""


@app.get("/api/project-requests")
def list_project_requests(_: bool = Depends(require_admin)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM project_requests ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/project-requests")
def create_project_request(body: ProjectRequestIn):
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO project_requests (name,email,project_type,budget,message)
           VALUES (?,?,?,?,?)""",
        (body.name, body.email, body.project_type, body.budget, body.message),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM project_requests WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/project-requests/{item_id}/status")
def update_project_status(item_id: int, status: str, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("UPDATE project_requests SET status = ? WHERE id = ?", (status, item_id))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/api/project-requests/{item_id}")
def delete_project_request(item_id: int, _: bool = Depends(require_admin)):
    conn = get_db()
    conn.execute("DELETE FROM project_requests WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Uploads (images / videos / logo)
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".mp4", ".webm"}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), _: bool = Depends(require_admin)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")
    safe_name = f"{secrets.token_hex(8)}{ext}"
    dest = UPLOADS_DIR / safe_name
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"/uploads/{safe_name}"}


# ---------------------------------------------------------------------------
# Static frontend
# ---------------------------------------------------------------------------

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


@app.get("/")
def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/admin")
def serve_admin():
    return FileResponse(str(FRONTEND_DIR / "admin.html"))
