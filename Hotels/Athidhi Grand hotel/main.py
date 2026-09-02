import json
import os
import re
import secrets
import sqlite3
import uuid
from datetime import date, datetime, timedelta
from functools import wraps

from flask import Flask, abort, jsonify, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from PIL import Image, ImageOps, UnidentifiedImageError


# ============================================================
# Configuration
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "frontend"))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "lodge.db")

app = Flask(
    __name__,
    static_folder=FRONTEND_DIR,
    static_url_path=""
)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "dev-secret-key-change-this-in-production"
)

app.config.update(
    SESSION_COOKIE_SECURE=os.environ.get(
        "SESSION_SECURE", "False"
    ).lower() == "true",
    SESSION_COOKIE_SAMESITE=os.environ.get(
        "SESSION_SAMESITE", "Lax"
    ),
    SESSION_COOKIE_HTTPONLY=True,
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
)

frontend_url = os.environ.get(
    "FRONTEND_URL",
    "http://localhost:5173"
)

cors_origins = [
    origin.strip()
    for origin in frontend_url.split(",")
    if origin.strip()
]

# Same-origin Flask hosting does not require CORS, but keeping it
# enabled supports running the frontend separately during development.
CORS(
    app,
    origins=cors_origins or ["http://localhost:5173"],
    supports_credentials=True
)

# Upload folders
for folder in ("rooms", "gallery", "hero", "temp"):
    os.makedirs(os.path.join(UPLOAD_FOLDER, folder), exist_ok=True)


# ============================================================
# Optional Cloudinary
# ============================================================

USE_CLOUDINARY = os.environ.get(
    "USE_CLOUDINARY", "false"
).lower() == "true"

if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    )


# ============================================================
# Database
# ============================================================

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS room (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                price_per_night REAL NOT NULL,
                amenities TEXT DEFAULT '[]',
                images TEXT DEFAULT '[]',
                is_available INTEGER DEFAULT 1,
                total_units INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS gallery_image (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT DEFAULT '',
                image_url TEXT NOT NULL,
                public_id TEXT,
                category TEXT DEFAULT 'property',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS booking_request (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_reference TEXT UNIQUE NOT NULL,
                guest_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                guests INTEGER NOT NULL,
                rooms INTEGER NOT NULL,
                preferred_room_id INTEGER,
                special_request TEXT DEFAULT '',
                status TEXT DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (preferred_room_id) REFERENCES room(id)
                    ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS site_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lodge_name TEXT,
                tagline TEXT,
                about_text TEXT,
                phone TEXT,
                address TEXT,
                email TEXT,
                map_embed_url TEXT,
                hero_image_url TEXT,
                hero_public_id TEXT,
                amenities TEXT DEFAULT '[]',
                social_links TEXT DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_booking_checkin
                ON booking_request(check_in);

            CREATE INDEX IF NOT EXISTS idx_booking_checkout
                ON booking_request(check_out);

            CREATE INDEX IF NOT EXISTS idx_booking_status
                ON booking_request(status);

            CREATE INDEX IF NOT EXISTS idx_booking_reference
                ON booking_request(booking_reference);
            """
        )

        # --------------------------------------------------------
        # Default site data
        # --------------------------------------------------------
        site = conn.execute(
            "SELECT id FROM site_info LIMIT 1"
        ).fetchone()

        if not site:
            conn.execute(
                """
                INSERT INTO site_info (
                    lodge_name,
                    tagline,
                    about_text,
                    phone,
                    address,
                    email,
                    map_embed_url,
                    hero_image_url,
                    hero_public_id,
                    amenities,
                    social_links
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "Athidhi Grand",
                    "Comfortable Stay in Kodad",
                    (
                        "Athidhi Grand offers budget-friendly accommodation "
                        "with 24/7 hot water and WiFi. Located in the heart "
                        "of Kodad, we are walking distance from the bus stand."
                    ),
                    "08985705777",
                    "Town Center Plaza, Opp: Govt. Hospital, Kodad, Telangana 508206",
                    "info@athidhigrand.com",
                    "",
                    "/hero.jpg",
                    None,
                    json.dumps([
                        "24/7 Hot Water",
                        "WiFi",
                        "Power Backup",
                        "AC Rooms",
                        "Walkable from Bus Stand"
                    ]),
                    json.dumps({})
                )
            )

        # --------------------------------------------------------
        # Bootstrap admin account
        # --------------------------------------------------------
        admin_count = conn.execute(
            "SELECT COUNT(*) AS count FROM admin"
        ).fetchone()["count"]

        if admin_count == 0:
            admin_username = os.environ.get(
                "ADMIN_USERNAME",
                "admin"
            ).strip()

            admin_password = os.environ.get(
                "ADMIN_PASSWORD",
                "Admin@12345"
            )

            if admin_username and admin_password:
                conn.execute(
                    """
                    INSERT INTO admin (username, password)
                    VALUES (?, ?)
                    """,
                    (
                        admin_username,
                        generate_password_hash(admin_password)
                    )
                )


# Initialize database
init_db()


# ============================================================
# JSON Helpers
# ============================================================

def json_array(value):
    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (TypeError, ValueError, json.JSONDecodeError):
            return []

    return []


def json_object(value):
    if value is None:
        return {}

    if isinstance(value, dict):
        return value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except (TypeError, ValueError, json.JSONDecodeError):
            return {}

    return {}


def clean_string(value, max_length=5000):
    if value is None:
        return ""

    return str(value).strip()[:max_length]


# ============================================================
# Authentication / CSRF
# ============================================================

def generate_csrf_token():
    if "_csrf_token" not in session:
        session["_csrf_token"] = secrets.token_urlsafe(32)

    return session["_csrf_token"]


def csrf_protect():
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    token = (
        request.headers.get("X-XSRF-TOKEN")
        or request.headers.get("X-CSRF-TOKEN")
    )

    session_token = session.get("_csrf_token")

    if (
        not token
        or not session_token
        or not secrets.compare_digest(
            str(token),
            str(session_token)
        )
    ):
        abort(403, description="CSRF token invalid")


def admin_required(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        if not session.get("admin_id"):
            return jsonify({
                "success": False,
                "message": "Not authenticated"
            }), 401

        return func(*args, **kwargs)

    return decorated


# ============================================================
# Image Helpers
# ============================================================

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}

MAX_IMAGE_PIXELS = 25_000_000


def validate_image(file):
    if not file or not file.filename:
        return False, "No image selected"

    extension = os.path.splitext(file.filename)[1].lower()

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return False, "Only JPG, JPEG, PNG and WebP images are allowed"

    try:
        file.stream.seek(0)

        image = Image.open(file.stream)

        if image.width * image.height > MAX_IMAGE_PIXELS:
            return False, "Image dimensions are too large"

        image.verify()

        file.stream.seek(0)

        return True, ""

    except (UnidentifiedImageError, OSError, ValueError):
        return False, "Invalid image file"

    finally:
        try:
            file.stream.seek(0)
        except Exception:
            pass


def process_image(file):
    filename = f"{uuid.uuid4().hex}.webp"
    temp_path = os.path.join(
        UPLOAD_FOLDER,
        "temp",
        filename
    )

    try:
        file.stream.seek(0)

        with Image.open(file.stream) as image:
            image = ImageOps.exif_transpose(image)

            # Remove alpha/background safely for WebP RGB output.
            if image.mode not in ("RGB", "RGBA"):
                image = image.convert("RGB")

            image.thumbnail(
                (1920, 1080),
                Image.Resampling.LANCZOS
            )

            if image.mode == "RGBA":
                background = Image.new(
                    "RGB",
                    image.size,
                    "white"
                )
                background.paste(
                    image,
                    mask=image.getchannel("A")
                )
                image = background
            else:
                image = image.convert("RGB")

            image.save(
                temp_path,
                "WEBP",
                quality=82,
                method=6
            )

        return temp_path

    except Exception as exc:
        if os.path.exists(temp_path):
            os.remove(temp_path)

        raise RuntimeError(
            f"Image processing failed: {exc}"
        ) from exc


def upload_image_to_storage(local_path, folder):
    if USE_CLOUDINARY:
        import cloudinary.uploader

        result = cloudinary.uploader.upload(
            local_path,
            folder=f"lodge/{folder}",
            resource_type="image"
        )

        if os.path.exists(local_path):
            os.remove(local_path)

        return {
            "url": result["secure_url"],
            "publicId": result["public_id"]
        }

    target_folder = os.path.join(
        UPLOAD_FOLDER,
        folder
    )

    os.makedirs(
        target_folder,
        exist_ok=True
    )

    filename = os.path.basename(local_path)
    target_path = os.path.join(
        target_folder,
        filename
    )

    os.replace(
        local_path,
        target_path
    )

    return {
        "url": f"/uploads/{folder}/{filename}",
        "publicId": None
    }


def delete_image_from_storage(image_obj, folder):
    if not image_obj:
        return

    url = image_obj.get("url")
    public_id = image_obj.get("publicId")

    if USE_CLOUDINARY and public_id:
        try:
            import cloudinary.uploader

            cloudinary.uploader.destroy(
                public_id,
                invalidate=True,
                resource_type="image"
            )
        except Exception:
            pass

    elif not USE_CLOUDINARY and url:
        filename = os.path.basename(
            url.rstrip("/").split("/")[-1]
        )

        file_path = os.path.join(
            UPLOAD_FOLDER,
            folder,
            filename
        )

        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass


# ============================================================
# Site Helpers
# ============================================================

def get_site_info():
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM site_info WHERE id = 1"
        ).fetchone()

        if not row:
            return {}

        data = dict(row)

        data["amenities"] = json_array(
            data.get("amenities")
        )

        data["social_links"] = json_object(
            data.get("social_links")
        )

        return data


def update_site_info(data):
    allowed_fields = {
        "lodge_name",
        "tagline",
        "about_text",
        "phone",
        "address",
        "email",
        "map_embed_url",
        "hero_image_url",
        "hero_public_id",
        "amenities",
        "social_links",
    }

    fields = []
    values = []

    for key, value in data.items():
        if key in allowed_fields:
            fields.append(f"{key} = ?")
            values.append(value)

    if not fields:
        return

    fields.append("updated_at = CURRENT_TIMESTAMP")

    with get_db() as conn:
        conn.execute(
            f"""
            UPDATE site_info
            SET {", ".join(fields)}
            WHERE id = 1
            """,
            values
        )
        conn.commit()


# ============================================================
# Booking Helpers
# ============================================================

def generate_reference():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    for _ in range(20):
        ref = (
            "AG-"
            + "".join(
                secrets.choice(alphabet)
                for _ in range(10)
            )
        )

        with get_db() as conn:
            exists = conn.execute(
                """
                SELECT 1
                FROM booking_request
                WHERE booking_reference = ?
                """,
                (ref,)
            ).fetchone()

        if not exists:
            return ref

    raise RuntimeError(
        "Unable to generate booking reference"
    )


def indian_phone_is_valid(phone):
    return bool(
        re.fullmatch(
            r"[6-9]\d{9}",
            phone
        )
    )


def parse_booking_date(value, field_name):
    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d"
        ).date()

    except (TypeError, ValueError):
        raise ValueError(
            f"Invalid {field_name}. Use YYYY-MM-DD."
        )


def room_to_dict(row):
    room = dict(row)

    room["amenities"] = json_array(
        room.get("amenities")
    )

    room["images"] = json_array(
        room.get("images")
    )

    room["is_available"] = bool(
        room.get("is_available")
    )

    return room


# ============================================================
# Error Handlers
# ============================================================

@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        "success": False,
        "message": getattr(
            error,
            "description",
            "Forbidden"
        )
    }), 403


@app.errorhandler(413)
def too_large(error):
    return jsonify({
        "success": False,
        "message": "Uploaded file is too large. Maximum size is 5MB."
    }), 413


@app.errorhandler(500)
def internal_error(error):
    app.logger.exception(error)

    return jsonify({
        "success": False,
        "message": "Internal server error"
    }), 500


# ============================================================
# Health
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "success": True,
        "status": "ok"
    })


# ============================================================
# Admin Authentication
# ============================================================

@app.route("/api/admin/csrf", methods=["GET"])
def admin_csrf():
    return jsonify({
        "success": True,
        "csrfToken": generate_csrf_token()
    })


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}

    username = clean_string(
        data.get("username"),
        100
    )

    password = str(
        data.get("password", "")
    )

    if not username or not password:
        return jsonify({
            "success": False,
            "message": "Username and password are required"
        }), 400

    with get_db() as conn:
        admin = conn.execute(
            """
            SELECT *
            FROM admin
            WHERE username = ?
            LIMIT 1
            """,
            (username,)
        ).fetchone()

    if not admin:
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401

    if not check_password_hash(
        admin["password"],
        password
    ):
        return jsonify({
            "success": False,
            "message": "Invalid credentials"
        }), 401

    session.clear()

    session.permanent = True
    session["admin_id"] = admin["id"]
    session["admin_username"] = admin["username"]

    csrf_token = generate_csrf_token()

    return jsonify({
        "success": True,
        "message": "Logged in",
        "csrfToken": csrf_token
    })


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    csrf_protect()

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out"
    })


@app.route("/api/admin/check", methods=["GET"])
def admin_check():
    if not session.get("admin_id"):
        return jsonify({
            "success": False,
            "message": "Not authenticated"
        }), 401

    return jsonify({
        "success": True,
        "message": "Authenticated",
        "csrfToken": generate_csrf_token()
    })


# ============================================================
# Site Info
# ============================================================

@app.route("/api/site", methods=["GET"])
def get_site():
    return jsonify({
        "success": True,
        "data": get_site_info()
    })


@app.route("/api/site", methods=["PUT"])
@admin_required
def update_site():
    csrf_protect()

    data = request.get_json(silent=True) or {}

    allowed = {
        "lodge_name",
        "tagline",
        "about_text",
        "phone",
        "address",
        "email",
        "map_embed_url",
        "amenities",
        "social_links",
    }

    filtered = {}

    for key in allowed:
        if key in data:
            filtered[key] = data[key]

    if "lodge_name" in filtered:
        filtered["lodge_name"] = clean_string(
            filtered["lodge_name"],
            150
        )

    if "tagline" in filtered:
        filtered["tagline"] = clean_string(
            filtered["tagline"],
            300
        )

    if "about_text" in filtered:
        filtered["about_text"] = clean_string(
            filtered["about_text"],
            5000
        )

    if "phone" in filtered:
        filtered["phone"] = clean_string(
            filtered["phone"],
            30
        )

    if "address" in filtered:
        filtered["address"] = clean_string(
            filtered["address"],
            500
        )

    if "email" in filtered:
        filtered["email"] = clean_string(
            filtered["email"],
            200
        )

        if filtered["email"]:
            email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

            if not re.fullmatch(
                email_pattern,
                filtered["email"]
            ):
                return jsonify({
                    "success": False,
                    "message": "Invalid email address"
                }), 400

    if "map_embed_url" in filtered:
        url = clean_string(
            filtered["map_embed_url"],
            1000
        )

        if url and not (
            url.startswith("https://www.google.com/maps/embed?")
            or url.startswith("https://www.google.com/maps")
        ):
            return jsonify({
                "success": False,
                "message": "Invalid Google Maps URL"
            }), 400

        filtered["map_embed_url"] = url

    if "amenities" in filtered:
        amenities = filtered["amenities"]

        if isinstance(amenities, str):
            amenities = [
                item.strip()
                for item in amenities.split(",")
                if item.strip()
            ]

        if not isinstance(amenities, list):
            return jsonify({
                "success": False,
                "message": "Amenities must be a list"
            }), 400

        filtered["amenities"] = json.dumps([
            clean_string(item, 100)
            for item in amenities
            if str(item).strip()
        ])

    if "social_links" in filtered:
        if not isinstance(
            filtered["social_links"],
            dict
        ):
            return jsonify({
                "success": False,
                "message": "Social links must be an object"
            }), 400

        filtered["social_links"] = json.dumps(
            filtered["social_links"]
        )

    update_site_info(filtered)

    return jsonify({
        "success": True,
        "message": "Site info updated"
    })


# ============================================================
# Hero
# ============================================================

@app.route("/api/site/hero", methods=["POST"])
@admin_required
def upload_hero():
    csrf_protect()

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "No image provided"
        }), 400

    file = request.files["image"]

    valid, message = validate_image(file)

    if not valid:
        return jsonify({
            "success": False,
            "message": message
        }), 400

    info = get_site_info()

    temp_path = None

    try:
        temp_path = process_image(file)

        old_hero = {
            "url": info.get("hero_image_url"),
            "publicId": info.get("hero_public_id")
        }

        result = upload_image_to_storage(
            temp_path,
            "hero"
        )

        delete_image_from_storage(
            old_hero,
            "hero"
        )

        update_site_info({
            "hero_image_url": result["url"],
            "hero_public_id": result.get("publicId")
        })

        return jsonify({
            "success": True,
            "message": "Hero image updated",
            "data": result
        })

    except Exception as exc:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "success": False,
            "message": str(exc)
        }), 500


@app.route("/api/site/hero", methods=["DELETE"])
@admin_required
def delete_hero():
    csrf_protect()

    info = get_site_info()

    old_hero = {
        "url": info.get("hero_image_url"),
        "publicId": info.get("hero_public_id")
    }

    delete_image_from_storage(
        old_hero,
        "hero"
    )

    update_site_info({
        "hero_image_url": "/hero.jpg",
        "hero_public_id": None
    })

    return jsonify({
        "success": True,
        "message": "Hero image reset"
    })


# ============================================================
# Rooms
# ============================================================

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM room
            ORDER BY id ASC
            """
        ).fetchall()

    rooms = [
        room_to_dict(row)
        for row in rows
    ]

    return jsonify({
        "success": True,
        "data": rooms
    })


@app.route("/api/rooms/<int:room_id>", methods=["GET"])
def get_room(room_id):
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM room
            WHERE id = ?
            """,
            (room_id,)
        ).fetchone()

    if not row:
        return jsonify({
            "success": False,
            "message": "Room not found"
        }), 404

    return jsonify({
        "success": True,
        "data": room_to_dict(row)
    })


@app.route("/api/rooms", methods=["POST"])
@admin_required
def create_room():
    csrf_protect()

    data = request.get_json(silent=True) or {}

    name = clean_string(
        data.get("name"),
        150
    )

    description = clean_string(
        data.get("description"),
        2000
    )

    if not name:
        return jsonify({
            "success": False,
            "message": "Room name is required"
        }), 400

    if not description:
        return jsonify({
            "success": False,
            "message": "Room description is required"
        }), 400

    try:
        price = float(
            data.get("pricePerNight")
        )
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid price"
        }), 400

    if price < 0:
        return jsonify({
            "success": False,
            "message": "Price cannot be negative"
        }), 400

    try:
        total_units = int(
            data.get("totalUnits", 1)
        )
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid total units"
        }), 400

    if total_units < 1 or total_units > 1000:
        return jsonify({
            "success": False,
            "message": "Total units must be between 1 and 1000"
        }), 400

    amenities = data.get(
        "amenities",
        []
    )

    if isinstance(amenities, str):
        amenities = [
            x.strip()
            for x in amenities.split(",")
            if x.strip()
        ]

    if not isinstance(amenities, list):
        return jsonify({
            "success": False,
            "message": "Amenities must be a list"
        }), 400

    is_available = 1 if data.get(
        "isAvailable",
        True
    ) else 0

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO room (
                name,
                description,
                price_per_night,
                amenities,
                images,
                is_available,
                total_units
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                description,
                price,
                json.dumps(amenities),
                json.dumps([]),
                is_available,
                total_units
            )
        )

        conn.commit()

        room_id = cursor.lastrowid

    return jsonify({
        "success": True,
        "message": "Room created",
        "data": {
            "id": room_id
        }
    }), 201


@app.route("/api/rooms/<int:room_id>", methods=["PUT"])
@admin_required
def update_room(room_id):
    csrf_protect()

    data = request.get_json(silent=True) or {}

    allowed_keys = {
        "name",
        "description",
        "pricePerNight",
        "amenities",
        "isAvailable",
        "totalUnits"
    }

    changes = {
        key: data[key]
        for key in allowed_keys
        if key in data
    }

    if not changes:
        return jsonify({
            "success": False,
            "message": "No changes provided"
        }), 400

    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT *
            FROM room
            WHERE id = ?
            """,
            (room_id,)
        ).fetchone()

        if not existing:
            return jsonify({
                "success": False,
                "message": "Room not found"
            }), 404

        update_fields = []
        values = []

        if "name" in changes:
            name = clean_string(
                changes["name"],
                150
            )

            if not name:
                return jsonify({
                    "success": False,
                    "message": "Room name is required"
                }), 400

            update_fields.append("name = ?")
            values.append(name)

        if "description" in changes:
            description = clean_string(
                changes["description"],
                2000
            )

            if not description:
                return jsonify({
                    "success": False,
                    "message": "Room description is required"
                }), 400

            update_fields.append("description = ?")
            values.append(description)

        if "pricePerNight" in changes:
            try:
                price = float(
                    changes["pricePerNight"]
                )
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "message": "Invalid price"
                }), 400

            if price < 0:
                return jsonify({
                    "success": False,
                    "message": "Price cannot be negative"
                }), 400

            update_fields.append(
                "price_per_night = ?"
            )
            values.append(price)

        if "amenities" in changes:
            amenities = changes["amenities"]

            if isinstance(amenities, str):
                amenities = [
                    x.strip()
                    for x in amenities.split(",")
                    if x.strip()
                ]

            if not isinstance(amenities, list):
                return jsonify({
                    "success": False,
                    "message": "Amenities must be a list"
                }), 400

            update_fields.append(
                "amenities = ?"
            )
            values.append(
                json.dumps(amenities)
            )

        if "isAvailable" in changes:
            update_fields.append(
                "is_available = ?"
            )
            values.append(
                1 if changes["isAvailable"] else 0
            )

        if "totalUnits" in changes:
            try:
                total_units = int(
                    changes["totalUnits"]
                )
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "message": "Invalid total units"
                }), 400

            if total_units < 1 or total_units > 1000:
                return jsonify({
                    "success": False,
                    "message": (
                        "Total units must be between "
                        "1 and 1000"
                    )
                }), 400

            update_fields.append(
                "total_units = ?"
            )
            values.append(total_units)

        if not update_fields:
            return jsonify({
                "success": False,
                "message": "No valid changes provided"
            }), 400

        update_fields.append(
            "updated_at = CURRENT_TIMESTAMP"
        )

        values.append(room_id)

        conn.execute(
            f"""
            UPDATE room
            SET {", ".join(update_fields)}
            WHERE id = ?
            """,
            values
        )

        conn.commit()

    return jsonify({
        "success": True,
        "message": "Room updated"
    })


@app.route("/api/rooms/<int:room_id>", methods=["DELETE"])
@admin_required
def delete_room(room_id):
    csrf_protect()

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT images
            FROM room
            WHERE id = ?
            """,
            (room_id,)
        ).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Room not found"
            }), 404

        images = json_array(
            row["images"]
        )

        for image in images:
            if isinstance(image, dict):
                delete_image_from_storage(
                    image,
                    "rooms"
                )

        conn.execute(
            """
            DELETE FROM room
            WHERE id = ?
            """,
            (room_id,)
        )

        conn.commit()

    return jsonify({
        "success": True,
        "message": "Room deleted"
    })


@app.route("/api/rooms/<int:room_id>/images", methods=["POST"])
@admin_required
def upload_room_image(room_id):
    csrf_protect()

    with get_db() as conn:
        exists = conn.execute(
            """
            SELECT id
            FROM room
            WHERE id = ?
            """,
            (room_id,)
        ).fetchone()

    if not exists:
        return jsonify({
            "success": False,
            "message": "Room not found"
        }), 404

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "No image provided"
        }), 400

    file = request.files["image"]

    valid, message = validate_image(file)

    if not valid:
        return jsonify({
            "success": False,
            "message": message
        }), 400

    temp_path = None

    try:
        temp_path = process_image(file)

        result = upload_image_to_storage(
            temp_path,
            "rooms"
        )

        with get_db() as conn:
            row = conn.execute(
                """
                SELECT images
                FROM room
                WHERE id = ?
                """,
                (room_id,)
            ).fetchone()

            images = json_array(
                row["images"]
            )

            images.append(result)

            conn.execute(
                """
                UPDATE room
                SET images = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    json.dumps(images),
                    room_id
                )
            )

            conn.commit()

        return jsonify({
            "success": True,
            "message": "Image uploaded",
            "data": result
        })

    except Exception as exc:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "success": False,
            "message": str(exc)
        }), 500


@app.route(
    "/api/rooms/<int:room_id>/images/<int:image_index>",
    methods=["DELETE"]
)
@admin_required
def delete_room_image(room_id, image_index):
    csrf_protect()

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT images
            FROM room
            WHERE id = ?
            """,
            (room_id,)
        ).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Room not found"
            }), 404

        images = json_array(
            row["images"]
        )

        if not (
            0 <= image_index < len(images)
        ):
            return jsonify({
                "success": False,
                "message": "Image not found"
            }), 404

        image_to_delete = images.pop(
            image_index
        )

        if isinstance(
            image_to_delete,
            dict
        ):
            delete_image_from_storage(
                image_to_delete,
                "rooms"
            )

        conn.execute(
            """
            UPDATE room
            SET images = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                json.dumps(images),
                room_id
            )
        )

        conn.commit()

    return jsonify({
        "success": True,
        "message": "Image deleted"
    })


# ============================================================
# Gallery
# ============================================================

@app.route("/api/gallery", methods=["GET"])
def get_gallery():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM gallery_image
            ORDER BY id DESC
            """
        ).fetchall()

    gallery = []

    for row in rows:
        gallery.append({
            "id": row["id"],
            "title": row["title"],
            "image": {
                "url": row["image_url"],
                "publicId": row["public_id"]
            },
            "category": row["category"]
        })

    return jsonify({
        "success": True,
        "data": gallery
    })


@app.route("/api/gallery", methods=["POST"])
@admin_required
def upload_gallery():
    csrf_protect()

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "No image provided"
        }), 400

    file = request.files["image"]

    title = clean_string(
        request.form.get("title", ""),
        200
    )

    category = clean_string(
        request.form.get(
            "category",
            "property"
        ),
        50
    ).lower()

    valid_categories = {
        "property",
        "food",
        "pool",
        "surroundings"
    }

    if category not in valid_categories:
        return jsonify({
            "success": False,
            "message": "Invalid gallery category"
        }), 400

    valid, message = validate_image(file)

    if not valid:
        return jsonify({
            "success": False,
            "message": message
        }), 400

    temp_path = None

    try:
        temp_path = process_image(file)

        result = upload_image_to_storage(
            temp_path,
            "gallery"
        )

        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO gallery_image (
                    title,
                    image_url,
                    public_id,
                    category
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    title,
                    result["url"],
                    result.get("publicId"),
                    category
                )
            )

            conn.commit()

        return jsonify({
            "success": True,
            "message": "Gallery image uploaded"
        }), 201

    except Exception as exc:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify({
            "success": False,
            "message": str(exc)
        }), 500


@app.route(
    "/api/gallery/<int:image_id>",
    methods=["DELETE"]
)
@admin_required
def delete_gallery(image_id):
    csrf_protect()

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT image_url, public_id
            FROM gallery_image
            WHERE id = ?
            """,
            (image_id,)
        ).fetchone()

        if not row:
            return jsonify({
                "success": False,
                "message": "Image not found"
            }), 404

        image_obj = {
            "url": row["image_url"],
            "publicId": row["public_id"]
        }

        delete_image_from_storage(
            image_obj,
            "gallery"
        )

        conn.execute(
            """
            DELETE FROM gallery_image
            WHERE id = ?
            """,
            (image_id,)
        )

        conn.commit()

    return jsonify({
        "success": True,
        "message": "Image deleted"
    })


# ============================================================
# Bookings
# ============================================================

@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True) or {}

    required = [
        "guestName",
        "phone",
        "checkIn",
        "checkOut",
        "guests",
        "rooms"
    ]

    for field in required:
        if field not in data:
            return jsonify({
                "success": False,
                "message": f"{field} required"
            }), 400

    guest_name = clean_string(
        data.get("guestName"),
        150
    )

    phone = clean_string(
        data.get("phone"),
        20
    ).replace(" ", "")

    if not guest_name:
        return jsonify({
            "success": False,
            "message": "Guest name is required"
        }), 400

    if not indian_phone_is_valid(phone):
        return jsonify({
            "success": False,
            "message": "Invalid Indian phone number"
        }), 400

    try:
        check_in = parse_booking_date(
            data.get("checkIn"),
            "check-in date"
        )

        check_out = parse_booking_date(
            data.get("checkOut"),
            "check-out date"
        )

    except ValueError as exc:
        return jsonify({
            "success": False,
            "message": str(exc)
        }), 400

    today = date.today()

    if check_in < today:
        return jsonify({
            "success": False,
            "message": "Check-in cannot be in the past"
        }), 400

    if check_out <= check_in:
        return jsonify({
            "success": False,
            "message": "Check-out must be after check-in"
        }), 400

    if (
        check_out - check_in
    ).days > 30:
        return jsonify({
            "success": False,
            "message": (
                "Booking period cannot exceed 30 days"
            )
        }), 400

    try:
        guests = int(data.get("guests"))
        rooms = int(data.get("rooms"))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid guest/room count"
        }), 400

    if guests < 1 or guests > 100:
        return jsonify({
            "success": False,
            "message": (
                "Guests must be between 1 and 100"
            )
        }), 400

    if rooms < 1 or rooms > 100:
        return jsonify({
            "success": False,
            "message": (
                "Rooms must be between 1 and 100"
            )
        }), 400

    preferred_room_id = data.get(
        "preferredRoom"
    )

    if preferred_room_id in (
        "",
        None
    ):
        preferred_room_id = None
    else:
        try:
            preferred_room_id = int(
                preferred_room_id
            )
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Invalid preferred room"
            }), 400

    special_request = clean_string(
        data.get("specialRequest", ""),
        2000
    )

    with get_db() as conn:
        if preferred_room_id is not None:
            room = conn.execute(
                """
                SELECT total_units, is_available
                FROM room
                WHERE id = ?
                """,
                (preferred_room_id,)
            ).fetchone()

            if not room:
                return jsonify({
                    "success": False,
                    "message": "Preferred room not found"
                }), 400

            if not room["is_available"]:
                return jsonify({
                    "success": False,
                    "message": "Selected room is currently unavailable"
                }), 409

            overlapping = conn.execute(
                """
                SELECT COALESCE(
                    SUM(rooms),
                    0
                ) AS total
                FROM booking_request
                WHERE preferred_room_id = ?
                  AND status = 'Confirmed'
                  AND check_in < ?
                  AND check_out > ?
                """,
                (
                    preferred_room_id,
                    check_out.isoformat(),
                    check_in.isoformat()
                )
            ).fetchone()

            total_confirmed = int(
                overlapping["total"] or 0
            )

            available = max(
                0,
                room["total_units"] - total_confirmed
            )

            if total_confirmed + rooms > room["total_units"]:
                return jsonify({
                    "success": False,
                    "message": (
                        f"Not enough rooms available. "
                        f"Only {available} left for these dates."
                    )
                }), 409

        ref = generate_reference()

        cursor = conn.execute(
            """
            INSERT INTO booking_request (
                booking_reference,
                guest_name,
                phone,
                check_in,
                check_out,
                guests,
                rooms,
                preferred_room_id,
                special_request,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')
            """,
            (
                ref,
                guest_name,
                phone,
                check_in.isoformat(),
                check_out.isoformat(),
                guests,
                rooms,
                preferred_room_id,
                special_request
            )
        )

        booking_id = cursor.lastrowid

        conn.commit()

        row = conn.execute(
            """
            SELECT
                b.*,
                r.name AS room_name
            FROM booking_request b
            LEFT JOIN room r
                ON b.preferred_room_id = r.id
            WHERE b.id = ?
            """,
            (booking_id,)
        ).fetchone()

    booking = dict(row)

    booking["bookingReference"] = (
        booking.pop("booking_reference")
    )

    booking["guestName"] = (
        booking.pop("guest_name")
    )

    booking["checkIn"] = (
        booking.pop("check_in")
    )

    booking["checkOut"] = (
        booking.pop("check_out")
    )

    booking["specialRequest"] = (
        booking.pop("special_request")
    )

    booking["preferredRoom"] = (
        {"name": booking["room_name"]}
        if booking.get("room_name")
        else None
    )

    booking.pop("room_name", None)
    booking.pop("preferred_room_id", None)

    return jsonify({
        "success": True,
        "data": booking
    }), 201


@app.route("/api/bookings", methods=["GET"])
@admin_required
def get_bookings():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
                b.*,
                r.name AS room_name
            FROM booking_request b
            LEFT JOIN room r
                ON b.preferred_room_id = r.id
            ORDER BY b.created_at DESC
            """
        ).fetchall()

    bookings = []

    for row in rows:
        booking = dict(row)

        booking["bookingReference"] = (
            booking.pop("booking_reference")
        )

        booking["guestName"] = (
            booking.pop("guest_name")
        )

        booking["checkIn"] = (
            booking.pop("check_in")
        )

        booking["checkOut"] = (
            booking.pop("check_out")
        )

        booking["specialRequest"] = (
            booking.pop("special_request")
        )

        booking["preferredRoom"] = (
            {"name": booking["room_name"]}
            if booking.get("room_name")
            else None
        )

        booking.pop("room_name", None)
        booking.pop("preferred_room_id", None)

        bookings.append(booking)

    return jsonify({
        "success": True,
        "data": bookings
    })


@app.route(
    "/api/bookings/<int:booking_id>",
    methods=["PUT"]
)
@admin_required
def update_booking_status(booking_id):
    csrf_protect()

    data = request.get_json(silent=True) or {}

    new_status = data.get("status")

    allowed_statuses = {
        "New",
        "Contacted",
        "Confirmed",
        "Cancelled"
    }

    if new_status not in allowed_statuses:
        return jsonify({
            "success": False,
            "message": "Invalid status"
        }), 400

    with get_db() as conn:
        # Start a write transaction to reduce confirmation races.
        conn.execute("BEGIN IMMEDIATE")

        booking = conn.execute(
            """
            SELECT *
            FROM booking_request
            WHERE id = ?
            """,
            (booking_id,)
        ).fetchone()

        if not booking:
            conn.rollback()

            return jsonify({
                "success": False,
                "message": "Booking not found"
            }), 404

        if (
            new_status == "Confirmed"
            and booking["preferred_room_id"]
        ):
            room = conn.execute(
                """
                SELECT
                    total_units,
                    is_available
                FROM room
                WHERE id = ?
                """,
                (
                    booking["preferred_room_id"],
                )
            ).fetchone()

            if not room:
                conn.rollback()

                return jsonify({
                    "success": False,
                    "message": "Room no longer exists"
                }), 400

            if not room["is_available"]:
                conn.rollback()

                return jsonify({
                    "success": False,
                    "message": "Room is currently unavailable"
                }), 409

            overlapping = conn.execute(
                """
                SELECT COALESCE(
                    SUM(rooms),
                    0
                ) AS total
                FROM booking_request
                WHERE preferred_room_id = ?
                  AND status = 'Confirmed'
                  AND id != ?
                  AND check_in < ?
                  AND check_out > ?
                """,
                (
                    booking["preferred_room_id"],
                    booking_id,
                    booking["check_out"],
                    booking["check_in"]
                )
            ).fetchone()

            total_confirmed = int(
                overlapping["total"] or 0
            )

            if (
                total_confirmed
                + booking["rooms"]
                > room["total_units"]
            ):
                conn.rollback()

                available = max(
                    0,
                    room["total_units"]
                    - total_confirmed
                )

                return jsonify({
                    "success": False,
                    "message": (
                        "Cannot confirm booking. "
                        f"Only {available} room(s) available."
                    )
                }), 409

        conn.execute(
            """
            UPDATE booking_request
            SET status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                new_status,
                booking_id
            )
        )

        conn.commit()

    return jsonify({
        "success": True,
        "message": "Booking status updated"
    })


# ============================================================
# Serve Uploaded Images
# ============================================================

@app.route(
    "/uploads/<folder>/<filename>",
    methods=["GET"]
)
def serve_upload(folder, filename):
    allowed_folders = {
        "rooms",
        "gallery",
        "hero"
    }

    if folder not in allowed_folders:
        abort(404)

    return send_from_directory(
        os.path.join(
            UPLOAD_FOLDER,
            folder
        ),
        filename
    )


# ============================================================
# Serve Frontend
# ============================================================

@app.route("/")
def serve_index():
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


@app.route("/admin")
def serve_admin():
    return send_from_directory(
        FRONTEND_DIR,
        "admin.html"
    )


@app.route(
    "/<path:path>"
)
def serve_static(path):
    requested = os.path.abspath(
        os.path.join(
            FRONTEND_DIR,
            path
        )
    )

    if not requested.startswith(
        FRONTEND_DIR + os.sep
    ):
        abort(404)

    if not os.path.isfile(requested):
        abort(404)

    return send_from_directory(
        FRONTEND_DIR,
        path
    )


# ============================================================
# Run
# ============================================================

if __name__ == "__main__":
    app.run(
        debug=True,
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                "5000"
            )
        )
    )