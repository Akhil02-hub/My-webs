import os
import sqlite3
import uuid
from pathlib import Path
from functools import wraps
from urllib.parse import urlparse

from flask import Flask, jsonify, request, session, redirect, url_for, render_template, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

@app.route("/googlec6fca3da7b3d490f.html")
def google_verification():
    return send_from_directory(
        Path(__file__).parent,
        "googlec6fca3da7b3d490f.html"
    )
    
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_INITIAL_PASSWORD = os.getenv("ADMIN_INITIAL_PASSWORD")

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "instance" / "akhilwebinvites.db"
UPLOAD_ROOT = BASE_DIR / "static" / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_UPLOAD_MB = 8
INSTAGRAM_DM_URL = "https://ig.me/m/websbyakhil"

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY", os.urandom(32).hex()),
    MAX_CONTENT_LENGTH=MAX_UPLOAD_MB * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
)

for p in [DB_PATH.parent, UPLOAD_ROOT / "invitations", UPLOAD_ROOT / "websites"]:
    p.mkdir(parents=True, exist_ok=True)


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS branding (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            brand_name TEXT NOT NULL,
            tagline TEXT DEFAULT '',
            hero_title TEXT DEFAULT '',
            hero_description TEXT DEFAULT '',
            logo_url TEXT DEFAULT '',
            instagram_url TEXT NOT NULL DEFAULT 'https://ig.me/m/websbyakhil'
        );
        CREATE TABLE IF NOT EXISTS invitations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Other',
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            price TEXT DEFAULT '',
            featured INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS websites (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Other',
            description TEXT DEFAULT '',
            image_url TEXT DEFAULT '',
            live_url TEXT DEFAULT '',
            tech_stack TEXT DEFAULT '',
            price TEXT DEFAULT '',
            featured INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO branding (id, brand_name, tagline, hero_title, hero_description, instagram_url)
        VALUES (1, 'AkhilWebInvites', 'Invitations & Websites', 'Beautiful digital experiences, made for you.', 'Premium invitation designs and modern websites crafted by Akhil.', 'https://ig.me/m/websbyakhil');
        """
    )
    conn.commit()
    conn.close()


def bootstrap_admin():
    conn = db()
    exists = conn.execute("SELECT 1 FROM admin_users LIMIT 1").fetchone()
    if not exists:
        username = os.getenv("ADMIN_USERNAME", "admin").strip()
        initial_password = os.getenv("ADMIN_INITIAL_PASSWORD")
        if not initial_password:
            print("WARNING: Set ADMIN_INITIAL_PASSWORD before first production start.")
        else:
            conn.execute(
                "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
                (username, generate_password_hash(initial_password)),
            )
            conn.commit()
    conn.close()


def allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def safe_url(value, fallback=""):
    value = (value or "").strip()
    if not value:
        return fallback
    if value.startswith("/static/uploads/"):
        return value
    try:
        p = urlparse(value)
        if p.scheme in {"http", "https"} and p.netloc:
            return value
    except Exception:
        pass
    return fallback


def admin_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id"):
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)
    return wrapped


def row_to_dict(row):
    d = dict(row)
    for key in ("featured",):
        if key in d:
            d[key] = bool(d[key])
    return d


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/admin")
def admin_page():
    return render_template("admin.html")


@app.get("/api/data")
def get_data():
    conn = db()
    branding = row_to_dict(conn.execute("SELECT * FROM branding WHERE id=1").fetchone())
    invitations = [row_to_dict(r) for r in conn.execute("SELECT * FROM invitations ORDER BY featured DESC, created_at DESC")]
    websites = [row_to_dict(r) for r in conn.execute("SELECT * FROM websites ORDER BY featured DESC, created_at DESC")]
    conn.close()
    return jsonify({"branding": branding, "invitations": invitations, "websites": websites, "instagramDm": INSTAGRAM_DM_URL})


@app.post("/api/admin/login")
def admin_login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    conn = db()
    row = conn.execute("SELECT * FROM admin_users WHERE username=?", (username,)).fetchone()
    conn.close()
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    session.clear()
    session["admin_id"] = row["id"]
    session["admin_username"] = row["username"]
    return jsonify({"ok": True, "username": row["username"]})


@app.post("/api/admin/logout")
def admin_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/admin/me")
def admin_me():
    if not session.get("admin_id"):
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "username": session.get("admin_username")})


@app.put("/api/branding")
@admin_required
def update_branding():
    payload = request.get_json(silent=True) or {}
    conn = db()
    conn.execute(
        """UPDATE branding SET brand_name=?, tagline=?, hero_title=?, hero_description=?, logo_url=?, instagram_url=? WHERE id=1""",
        (
            (payload.get("brand_name") or "AkhilWebInvites").strip(),
            (payload.get("tagline") or "").strip(),
            (payload.get("hero_title") or "").strip(),
            (payload.get("hero_description") or "").strip(),
            safe_url(payload.get("logo_url"), ""),
            safe_url(payload.get("instagram_url"), INSTAGRAM_DM_URL),
        ),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.post("/api/uploads/<kind>")
@admin_required
def upload(kind):
    if kind not in {"invitations", "websites"}:
        return jsonify({"error": "Invalid upload type"}), 400
    file = request.files.get("file")
    if not file or not file.filename or not allowed(file.filename):
        return jsonify({"error": "Unsupported image file"}), 400
    ext = file.filename.rsplit(".", 1)[1].lower()
    name = f"{uuid.uuid4().hex}.{ext}"
    target = UPLOAD_ROOT / kind / secure_filename(name)
    file.save(target)
    return jsonify({"url": f"/static/uploads/{kind}/{name}"})


@app.post("/api/invitations")
@admin_required
def create_invitation():
    p = request.get_json(silent=True) or {}
    title = (p.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    item_id = uuid.uuid4().hex[:12]
    conn = db()
    conn.execute(
        "INSERT INTO invitations (id,title,category,description,image_url,price,featured) VALUES (?,?,?,?,?,?,?)",
        (item_id, title, (p.get("category") or "Other").strip(), (p.get("description") or "").strip(),
         safe_url(p.get("image_url"), ""), (p.get("price") or "").strip(), int(bool(p.get("featured"))))
    )
    conn.commit()
    row = conn.execute("SELECT * FROM invitations WHERE id=?", (item_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@app.put("/api/invitations/<item_id>")
@admin_required
def update_invitation(item_id):
    p = request.get_json(silent=True) or {}
    conn = db()
    conn.execute(
        """UPDATE invitations SET title=?,category=?,description=?,image_url=?,price=?,featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
        ((p.get("title") or "").strip(), (p.get("category") or "Other").strip(), (p.get("description") or "").strip(),
         safe_url(p.get("image_url"), ""), (p.get("price") or "").strip(), int(bool(p.get("featured"))), item_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM invitations WHERE id=?", (item_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Invitation not found"}), 404
    return jsonify(row_to_dict(row))


@app.delete("/api/invitations/<item_id>")
@admin_required
def delete_invitation(item_id):
    conn = db()
    cur = conn.execute("DELETE FROM invitations WHERE id=?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": cur.rowcount > 0})


@app.post("/api/websites")
@admin_required
def create_website():
    p = request.get_json(silent=True) or {}
    title = (p.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400
    live_url = safe_url(p.get("live_url"), "")
    if not live_url:
        return jsonify({"error": "A valid https/http live URL is required"}), 400
    item_id = uuid.uuid4().hex[:12]
    conn = db()
    conn.execute(
        "INSERT INTO websites (id,title,category,description,image_url,live_url,tech_stack,price,featured) VALUES (?,?,?,?,?,?,?,?,?)",
        (item_id, title, (p.get("category") or "Other").strip(), (p.get("description") or "").strip(),
         safe_url(p.get("image_url"), ""), live_url, (p.get("tech_stack") or "").strip(), (p.get("price") or "").strip(), int(bool(p.get("featured"))))
    )
    conn.commit()
    row = conn.execute("SELECT * FROM websites WHERE id=?", (item_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@app.put("/api/websites/<item_id>")
@admin_required
def update_website(item_id):
    p = request.get_json(silent=True) or {}
    live_url = safe_url(p.get("live_url"), "")
    if not live_url:
        return jsonify({"error": "A valid https/http live URL is required"}), 400
    conn = db()
    conn.execute(
        """UPDATE websites SET title=?,category=?,description=?,image_url=?,live_url=?,tech_stack=?,price=?,featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?""",
        ((p.get("title") or "").strip(), (p.get("category") or "Other").strip(), (p.get("description") or "").strip(),
         safe_url(p.get("image_url"), ""), live_url, (p.get("tech_stack") or "").strip(), (p.get("price") or "").strip(), int(bool(p.get("featured"))), item_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM websites WHERE id=?", (item_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Website not found"}), 404
    return jsonify(row_to_dict(row))


@app.delete("/api/websites/<item_id>")
@admin_required
def delete_website(item_id):
    conn = db()
    cur = conn.execute("DELETE FROM websites WHERE id=?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": cur.rowcount > 0})


@app.put("/api/admin/password")
@admin_required
def change_password():
    p = request.get_json(silent=True) or {}
    current = p.get("current_password") or ""
    new = p.get("new_password") or ""
    if len(new) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    conn = db()
    row = conn.execute("SELECT password_hash FROM admin_users WHERE id=?", (session["admin_id"],)).fetchone()
    if not row or not check_password_hash(row["password_hash"], current):
        conn.close()
        return jsonify({"error": "Current password is incorrect"}), 400
    conn.execute("UPDATE admin_users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (generate_password_hash(new), session["admin_id"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.errorhandler(413)
def too_large(_):
    return jsonify({"error": f"Image too large. Maximum size is {MAX_UPLOAD_MB} MB."}), 413


init_db()
bootstrap_admin()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "0") == "1")
