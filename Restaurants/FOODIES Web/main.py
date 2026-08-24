import os
import sqlite3
import re
import math
import time
import threading
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, validator
from passlib.context import CryptContext
from jose import JWTError, jwt

# ============================================================
# APP & CONFIG
# ============================================================

app = FastAPI(title="Foodies API", version="2.1")

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").strip().lower() == "production"

# Same-origin frontend does not require CORS. Explicit origins can be
# supplied when another frontend domain needs API access.
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "").strip()
if ALLOWED_ORIGINS_RAW:
    ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",") if o.strip()]
    if IS_PRODUCTION and "*" in ALLOWED_ORIGINS:
        raise RuntimeError("ALLOWED_ORIGINS='*' is not allowed in production")
else:
    ALLOWED_ORIGINS = [] if IS_PRODUCTION else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=bool(ALLOWED_ORIGINS and "*" not in ALLOWED_ORIGINS),
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

ADMIN_KEY = os.getenv("ADMIN_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")

if IS_PRODUCTION:
    if not ADMIN_KEY:
        raise RuntimeError("ADMIN_KEY environment variable is required in production")
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is required in production")
    if len(JWT_SECRET) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters in production")
else:
    if not ADMIN_KEY:
        print("WARNING: ADMIN_KEY not set; using development default")
        ADMIN_KEY = "FoodiesAdmin2024!"
    if not JWT_SECRET:
        print("WARNING: JWT_SECRET not set; using development default")
        JWT_SECRET = "supersecretjwtkeychangeinproduction"

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24 * 7
TIZOLA_URL = "https://tizola.in/share/foodies2/5680"
WHATSAPP_NUMBER = "919951000029"

# Input limits
MAX_USERNAME_LEN = 50
MAX_NAME_LEN = 100
MAX_PHONE_LEN = 10
MAX_COMMENT_LEN = 500
MAX_QUESTION_LEN = 200
MAX_ANSWER_LEN = 200
MAX_ITEM_NAME_LEN = 100
MAX_DESCRIPTION_LEN = 500
MAX_MESSAGE_LEN = 500
MAX_PASSWORD_LEN = 72  # bcrypt practical byte limit
MAX_IMAGE_LEN = 2_500_000  # protects SQLite from huge Base64 payloads
MAX_CART_QUANTITY = 99

# ============================================================
# SIMPLE RATE LIMITER (per process / per IP)
# Use Redis for multi-instance deployments.
# ============================================================

_rate_lock = threading.Lock()
_rate_state = {}


def rate_limit(request: Request, bucket: str, limit: int, window_seconds: int) -> None:
    ip = request.client.host if request.client else "unknown"
    key = (bucket, ip)
    now = time.monotonic()
    with _rate_lock:
        timestamps = [t for t in _rate_state.get(key, []) if now - t < window_seconds]
        if len(timestamps) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        timestamps.append(now)
        _rate_state[key] = timestamps


# ============================================================
# PASSWORD & JWT HELPERS
# ============================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

# ============================================================
# DATABASE
# ============================================================

DB_PATH = os.path.join(os.path.dirname(__file__), "dhaba.db")


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users first because bookings/requests reference users.
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            security_question TEXT NOT NULL,
            security_answer_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            veg INTEGER DEFAULT 1,
            popular INTEGER DEFAULT 0,
            chef_special INTEGER DEFAULT 0,
            available INTEGER DEFAULT 1,
            image TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS signature_favourites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT '',
            description TEXT DEFAULT '',
            price REAL NOT NULL,
            image TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            guests INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            comment TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gallery_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT DEFAULT '',
            category TEXT DEFAULT 'Food',
            image TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_favourites (
            user_id INTEGER NOT NULL,
            menu_item_id INTEGER NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, menu_item_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            item_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    conn.commit()
    conn.close()


init_db()

# ============================================================
# VALIDATION HELPERS
# ============================================================

PHONE_RE = re.compile(r"^\d{10}$")
DATA_IMAGE_RE = re.compile(
    r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$",
    re.IGNORECASE,
)


def validate_phone_value(v):
    if not isinstance(v, str) or not PHONE_RE.fullmatch(v):
        raise ValueError("Phone must be exactly 10 digits")
    return v


def validate_non_empty(v):
    if not isinstance(v, str) or not v.strip():
        raise ValueError("Field cannot be empty or whitespace")
    return v.strip()


def validate_future_date(v):
    if not isinstance(v, str):
        raise ValueError("Invalid date format, use YYYY-MM-DD")
    try:
        dt = datetime.strptime(v, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Invalid date format, use YYYY-MM-DD")
    if dt.date() < date.today():
        raise ValueError("Date cannot be in the past")
    return v


def validate_time_value(v):
    if not isinstance(v, str):
        raise ValueError("Invalid time format, use HH:MM")
    try:
        datetime.strptime(v, "%H:%M")
    except ValueError:
        raise ValueError("Invalid time format, use HH:MM")
    return v


def validate_finite_price(v):
    if not math.isfinite(v):
        raise ValueError("Price must be a finite number")
    return v


def validate_image_value(v, optional=True):
    if v is None or v == "":
        if optional:
            return v or ""
        raise ValueError("Image is required")
    if not isinstance(v, str):
        raise ValueError("Invalid image format")
    if len(v) > MAX_IMAGE_LEN:
        raise ValueError("Image is too large")
    if v.startswith("data:image/"):
        if not DATA_IMAGE_RE.fullmatch(v):
            raise ValueError("Invalid Base64 image format")
        return v
    if v.startswith("https://"):
        return v
    raise ValueError("Only HTTPS image URLs or supported Base64 images are allowed")

# ============================================================
# DEPENDENCIES
# ============================================================


def verify_admin_key(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return x_admin_key
@app.post("/api/admin-verify")
async def admin_verify(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return {"success": True, "message": "Admin verified"}

def get_current_user_optional(token: Optional[str] = Header(None, alias="Authorization")):
    if not token:
        return None
    if not token.startswith("Bearer "):
        return None
    parts = token.split(" ", 1)
    if len(parts) != 2:
        return None
    payload = decode_token(parts[1].strip())
    if not payload:
        return None
    try:
        return int(payload.get("sub"))
    except (ValueError, TypeError):
        return None


def get_current_user(token: str = Header(..., alias="Authorization")):
    user_id = get_current_user_optional(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    conn = get_db_connection()
    row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user_id


def get_optional_user_strict(token: Optional[str] = Header(None, alias="Authorization")):
    if token is None:
        return None
    user_id = get_current_user_optional(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id

# ============================================================
# PYDANTIC MODELS
# ============================================================

class RegisterRequest(BaseModel):
    username: str = Field(..., max_length=MAX_USERNAME_LEN)
    phone: str = Field(..., max_length=MAX_PHONE_LEN)
    email: Optional[str] = Field(None, max_length=100)
    password: str = Field(..., min_length=6, max_length=MAX_PASSWORD_LEN)
    security_question: str = Field(..., max_length=MAX_QUESTION_LEN)
    security_answer: str = Field(..., max_length=MAX_ANSWER_LEN)

    @validator("username", "security_question", "security_answer", pre=True)
    def trim_non_empty(cls, v):
        return validate_non_empty(v)

    @validator("phone")
    def validate_phone(cls, v):
        return validate_phone_value(v)


class LoginRequest(BaseModel):
    username: str = Field(..., max_length=MAX_USERNAME_LEN)
    password: str = Field(..., min_length=6, max_length=MAX_PASSWORD_LEN)

    @validator("username")
    def trim_username(cls, v):
        return validate_non_empty(v)


class ResetPasswordRequest(BaseModel):
    username: str = Field(..., max_length=MAX_USERNAME_LEN)
    security_answer: str = Field(..., max_length=MAX_ANSWER_LEN)
    new_password: str = Field(..., min_length=6, max_length=MAX_PASSWORD_LEN)

    @validator("username", "security_answer", pre=True)
    def trim_non_empty(cls, v):
        return validate_non_empty(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class MenuItemCreate(BaseModel):
    name: str = Field(..., max_length=MAX_ITEM_NAME_LEN)
    category: str = Field(..., max_length=50)
    description: Optional[str] = Field("", max_length=MAX_DESCRIPTION_LEN)
    price: float
    veg: bool = True
    popular: bool = False
    chef_special: bool = False
    available: bool = True
    image: Optional[str] = ""

    @validator("name", "category", pre=True)
    def trim_required(cls, v):
        return validate_non_empty(v)

    @validator("price")
    def validate_price(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative")
        return validate_finite_price(v)

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v)


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=MAX_ITEM_NAME_LEN)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LEN)
    price: Optional[float] = None
    veg: Optional[bool] = None
    popular: Optional[bool] = None
    chef_special: Optional[bool] = None
    available: Optional[bool] = None
    image: Optional[str] = None

    @validator("name", "category", pre=True)
    def trim_optional(cls, v):
        return validate_non_empty(v) if v is not None else v

    @validator("price")
    def validate_price(cls, v):
        if v is None:
            return v
        if v < 0:
            raise ValueError("Price cannot be negative")
        return validate_finite_price(v)

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v) if v is not None else v


class SignatureFavouriteCreate(BaseModel):
    name: str = Field(..., max_length=MAX_ITEM_NAME_LEN)
    category: str = Field("", max_length=50)
    description: str = Field("", max_length=MAX_DESCRIPTION_LEN)
    price: float
    image: Optional[str] = ""

    @validator("name")
    def trim_name(cls, v):
        return validate_non_empty(v)

    @validator("price")
    def validate_price(cls, v):
        if v < 0:
            raise ValueError("Price cannot be negative")
        return validate_finite_price(v)

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v)


class SignatureFavouriteUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=MAX_ITEM_NAME_LEN)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LEN)
    price: Optional[float] = None
    image: Optional[str] = None

    @validator("name", "category", pre=True)
    def trim_optional(cls, v):
        return validate_non_empty(v) if v is not None else v

    @validator("price")
    def validate_price(cls, v):
        if v is None:
            return v
        if v < 0:
            raise ValueError("Price cannot be negative")
        return validate_finite_price(v)

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v) if v is not None else v


class BookingCreate(BaseModel):
    name: str = Field(..., max_length=MAX_NAME_LEN)
    phone: str = Field(..., max_length=MAX_PHONE_LEN)
    guests: int
    date: str
    time: str
    notes: Optional[str] = Field("", max_length=MAX_MESSAGE_LEN)

    @validator("name", pre=True)
    def trim_name(cls, v):
        return validate_non_empty(v)

    @validator("phone")
    def validate_phone(cls, v):
        return validate_phone_value(v)

    @validator("guests")
    def validate_guests(cls, v):
        if v <= 0:
            raise ValueError("Guests must be greater than 0")
        if v > 50:
            raise ValueError("Maximum 50 guests allowed")
        return v

    @validator("date")
    def validate_date(cls, v):
        return validate_future_date(v)

    @validator("time")
    def validate_time(cls, v):
        return validate_time_value(v)


class BookingUpdate(BaseModel):
    status: str

    @validator("status")
    def validate_status(cls, v):
        allowed = {"Pending", "Confirmed", "Cancelled"}
        if v not in allowed:
            raise ValueError("Invalid status")
        return v


class ReviewCreate(BaseModel):
    name: str = Field(..., max_length=MAX_NAME_LEN)
    rating: int
    comment: str = Field(..., max_length=MAX_COMMENT_LEN)

    @validator("name", pre=True)
    def trim_name(cls, v):
        return validate_non_empty(v)

    @validator("comment")
    def validate_comment(cls, v):
        return validate_non_empty(v)

    @validator("rating")
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class GalleryCreate(BaseModel):
    label: str = Field("", max_length=100)
    category: str = Field("Food", max_length=50)
    image: str

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v, optional=False)


class AboutImageUpdate(BaseModel):
    image: Optional[str] = None

    @validator("image")
    def validate_image(cls, v):
        return validate_image_value(v) if v is not None else v


class FavouriteToggle(BaseModel):
    menu_item_id: int


class RequestCreate(BaseModel):
    item_name: str = Field(..., max_length=MAX_ITEM_NAME_LEN)
    phone: str = Field(..., max_length=MAX_PHONE_LEN)
    message: Optional[str] = Field("", max_length=MAX_MESSAGE_LEN)

    @validator("item_name", pre=True)
    def trim_item(cls, v):
        return validate_non_empty(v)

    @validator("phone")
    def validate_phone(cls, v):
        return validate_phone_value(v)

# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ============================================================
# AUTH
# ============================================================

@app.post("/api/auth/register")
async def register(req: RegisterRequest, request: Request):
    rate_limit(request, "register", 8, 600)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE username = ? OR phone = ?", (req.username, req.phone))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username or phone already registered")
        password_hash = get_password_hash(req.password)
        answer_hash = get_password_hash(req.security_answer.strip().lower())
        cursor.execute(
            """INSERT INTO users (username, phone, email, password_hash, security_question, security_answer_hash)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (req.username, req.phone, req.email.strip() if req.email else None,
             password_hash, req.security_question.strip(), answer_hash),
        )
        conn.commit()
        return {"message": "User registered successfully", "user_id": cursor.lastrowid}
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username or phone already registered")
    finally:
        conn.close()


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request):
    rate_limit(request, "login", 10, 600)
    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (req.username,),
    ).fetchone()
    conn.close()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return TokenResponse(access_token=token, user_id=user["id"], username=user["username"])


@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request):
    rate_limit(request, "reset_password", 5, 600)
    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, security_answer_hash FROM users WHERE username = ?",
        (req.username,),
    ).fetchone()
    if not user:
        conn.close()
        # Generic response reduces account enumeration.
        raise HTTPException(status_code=400, detail="Password reset failed")
    if not verify_password(req.security_answer.strip().lower(), user["security_answer_hash"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Password reset failed")
    new_hash = get_password_hash(req.new_password)
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Password reset successful"}


@app.get("/api/auth/security-question")
async def get_security_question(username: str, request: Request):
    rate_limit(request, "security_question", 20, 600)
    conn = get_db_connection()
    row = conn.execute("SELECT security_question FROM users WHERE username = ?", (username.strip(),)).fetchone()
    conn.close()
    if not row:
        return {"question": ""}
    return {"question": row["security_question"]}


@app.get("/api/auth/me")
async def get_me(user_id: int = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT id, username, phone, email, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)

# ============================================================
# CONSTANT URLS
# ============================================================

@app.get("/api/tizola-url")
async def get_tizola_url():
    return {"url": TIZOLA_URL}


@app.get("/api/whatsapp-number")
async def get_whatsapp_number():
    return {"number": WHATSAPP_NUMBER}

# ============================================================
# MENU
# ============================================================

@app.get("/api/menu")
async def get_menu(category: Optional[str] = None, search: Optional[str] = None):
    conn = get_db_connection()
    query = "SELECT * FROM menu_items WHERE 1=1"
    params = []
    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)
    if search:
        safe_search = search[:100]
        query += " AND (name LIKE ? OR description LIKE ?)"
        params.extend([f"%{safe_search}%", f"%{safe_search}%"])
    query += " ORDER BY id DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/menu", dependencies=[Depends(verify_admin_key)])
async def create_menu_item(item: MenuItemCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO menu_items
           (name, category, description, price, veg, popular, chef_special, available, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (item.name, item.category, item.description or "", item.price, int(item.veg),
         int(item.popular), int(item.chef_special), int(item.available), item.image or ""),
    )
    conn.commit()
    new_id = cursor.lastrowid
    row = cursor.execute("SELECT * FROM menu_items WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/menu/{id}", dependencies=[Depends(verify_admin_key)])
async def update_menu_item(id: int, update: MenuItemUpdate):
    data = update.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    conn = get_db_connection()
    cursor = conn.cursor()
    fields, values = [], []
    for key, value in data.items():
        if key in {"veg", "popular", "chef_special", "available"}:
            value = int(value)
        fields.append(f"{key} = ?")
        values.append(value)
    values.append(id)
    cursor.execute(f"UPDATE menu_items SET {', '.join(fields)} WHERE id = ?", values)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Menu item not found")
    conn.commit()
    conn.close()
    return {"message": "Menu item updated"}


@app.delete("/api/menu/{id}", dependencies=[Depends(verify_admin_key)])
async def delete_menu_item(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM menu_items WHERE id = ?", (id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Menu item not found")
    conn.commit()
    conn.close()
    return {"message": "Menu item deleted"}

# ============================================================
# SIGNATURE FAVOURITES / FEATURED
# ============================================================

@app.get("/api/signature-favourites")
async def get_signature_favourites():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM signature_favourites ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/signature-favourites", dependencies=[Depends(verify_admin_key)])
async def create_signature_favourite(item: SignatureFavouriteCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO signature_favourites (name, category, description, price, image)
           VALUES (?, ?, ?, ?, ?)""",
        (item.name, item.category, item.description, item.price, item.image or ""),
    )
    conn.commit()
    new_id = cursor.lastrowid
    row = cursor.execute("SELECT * FROM signature_favourites WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/signature-favourites/{id}", dependencies=[Depends(verify_admin_key)])
async def update_signature_favourite(id: int, item: SignatureFavouriteUpdate):
    data = item.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    conn = get_db_connection()
    cursor = conn.cursor()
    fields, values = [], []
    for key, value in data.items():
        fields.append(f"{key} = ?")
        values.append(value)
    values.append(id)
    cursor.execute(f"UPDATE signature_favourites SET {', '.join(fields)} WHERE id = ?", values)
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Signature Favourite not found")
    conn.commit()
    row = cursor.execute("SELECT * FROM signature_favourites WHERE id = ?", (id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/signature-favourites/{id}", dependencies=[Depends(verify_admin_key)])
async def delete_signature_favourite(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM signature_favourites WHERE id = ?", (id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Signature Favourite not found")
    conn.commit()
    conn.close()
    return {"message": "Signature Favourite deleted"}


@app.get("/api/featured")
async def get_featured():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM signature_favourites ORDER BY id DESC LIMIT 6").fetchall()
    conn.close()
    return [dict(row) for row in rows]

# ============================================================
# BOOKINGS
# ============================================================

@app.post("/api/bookings")
async def create_booking(
    booking: BookingCreate,
    request: Request,
    token: Optional[str] = Header(None, alias="Authorization"),
):
    rate_limit(request, "bookings", 10, 600)

    try:
        user_id = get_optional_user_strict(token)

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO bookings
            (user_id, name, phone, guests, date, time, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                booking.name,
                booking.phone,
                booking.guests,
                booking.date,
                booking.time,
                booking.notes or "",
            ),
        )

        conn.commit()
        new_id = cursor.lastrowid

        row = cursor.execute(
            "SELECT * FROM bookings WHERE id = ?",
            (new_id,),
        ).fetchone()

        conn.close()

        return dict(row)

    except sqlite3.Error as e:
        print("BOOKING DATABASE ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to create booking"
        )

    except Exception as e:
        print("BOOKING ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to create booking"
        )


@app.get("/api/bookings", dependencies=[Depends(verify_admin_key)])
async def get_all_bookings():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM bookings ORDER BY date DESC, time DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/my-bookings")
async def get_my_bookings(user_id: int = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM bookings WHERE user_id = ? ORDER BY date DESC, time DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.patch("/api/bookings/{id}", dependencies=[Depends(verify_admin_key)])
async def update_booking(id: int, update: BookingUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE bookings SET status = ? WHERE id = ?", (update.status, id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    conn.commit()
    conn.close()
    return {"message": "Booking updated"}

# ============================================================
# REVIEWS
# ============================================================

@app.get("/api/reviews")
async def get_reviews():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM reviews ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/reviews")
async def create_review(review: ReviewCreate, request: Request):
    rate_limit(request, "reviews", 8, 600)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)",
        (review.name, review.rating, review.comment.strip()),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {
        "id": new_id,
        "name": review.name,
        "rating": review.rating,
        "comment": review.comment.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@app.delete("/api/reviews/{id}", dependencies=[Depends(verify_admin_key)])
async def delete_review(id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reviews WHERE id = ?", (id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Review not found")
    conn.commit()
    conn.close()
    return {"message": "Review deleted"}

# ============================================================
# GALLERY
# ============================================================

@app.get("/api/gallery")
async def get_gallery():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM gallery_items ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/gallery", dependencies=[Depends(verify_admin_key)])
async def add_gallery_item(item: GalleryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO gallery_items (label, category, image) VALUES (?, ?, ?)",
        (item.label, item.category, item.image),
    )
    conn.commit()
    new_id = cursor.lastrowid
    row = cursor.execute("SELECT * FROM gallery_items WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/gallery/{item_id}", dependencies=[Depends(verify_admin_key)])
async def delete_gallery_item(item_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM gallery_items WHERE id = ?", (item_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Gallery image not found")
    conn.commit()
    conn.close()
    return {"message": "Gallery image deleted"}

# ============================================================
# ABOUT IMAGE
# ============================================================

@app.get("/api/about-image")
async def get_about_image():
    conn = get_db_connection()
    row = conn.execute("SELECT value FROM site_settings WHERE key = 'about_image'").fetchone()
    conn.close()
    return {"image": row["value"] if row else ""}


@app.put("/api/about-image", dependencies=[Depends(verify_admin_key)])
async def set_about_image(update: AboutImageUpdate):
    conn = get_db_connection()
    conn.execute(
        """INSERT INTO site_settings (key, value) VALUES ('about_image', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
        (update.image or "",),
    )
    conn.commit()
    conn.close()
    return {"image": update.image or ""}

# ============================================================
# FAVOURITES
# ============================================================

@app.post("/api/favourites/toggle")
async def toggle_favourite(toggle: FavouriteToggle, user_id: int = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM menu_items WHERE id = ?", (toggle.menu_item_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Menu item not found")
    exists = cursor.execute(
        "SELECT 1 FROM user_favourites WHERE user_id = ? AND menu_item_id = ?",
        (user_id, toggle.menu_item_id),
    ).fetchone()
    if exists:
        cursor.execute(
            "DELETE FROM user_favourites WHERE user_id = ? AND menu_item_id = ?",
            (user_id, toggle.menu_item_id),
        )
        conn.commit()
        conn.close()
        return {"favourite": False, "message": "Removed from favourites"}
    cursor.execute(
        "INSERT INTO user_favourites (user_id, menu_item_id) VALUES (?, ?)",
        (user_id, toggle.menu_item_id),
    )
    conn.commit()
    conn.close()
    return {"favourite": True, "message": "Added to favourites"}


@app.get("/api/favourites")
async def get_favourites(user_id: int = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT m.* FROM menu_items m
           JOIN user_favourites f ON m.id = f.menu_item_id
           WHERE f.user_id = ?
           ORDER BY f.added_at DESC""",
        (user_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/favourites/ids")
async def get_favourite_ids(user_id: int = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT menu_item_id FROM user_favourites WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    conn.close()
    return [row["menu_item_id"] for row in rows]

# ============================================================
# REQUESTS
# ============================================================

@app.post("/api/requests")
async def create_request(
    req: RequestCreate,
    request: Request,
    token: Optional[str] = Header(None, alias="Authorization"),
):
    rate_limit(request, "requests", 10, 600)
    user_id = get_optional_user_strict(token)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO requests (user_id, item_name, phone, message)
           VALUES (?, ?, ?, ?)""",
        (user_id, req.item_name.strip(), req.phone, req.message or ""),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {
        "id": new_id,
        "item_name": req.item_name.strip(),
        "phone": req.phone,
        "message": req.message or "",
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

# ============================================================
# STATS
# ============================================================

@app.get("/api/stats", dependencies=[Depends(verify_admin_key)])
async def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    today = date.today().isoformat()
    today_bookings = cursor.execute("SELECT COUNT(*) FROM bookings WHERE date = ?", (today,)).fetchone()[0]
    pending_bookings = cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Pending'").fetchone()[0]
    confirmed_bookings = cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Confirmed'").fetchone()[0]
    total_bookings = cursor.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
    total_reviews = cursor.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    menu_count = cursor.execute("SELECT COUNT(*) FROM menu_items").fetchone()[0]
    signature_count = cursor.execute("SELECT COUNT(*) FROM signature_favourites").fetchone()[0]
    conn.close()
    return {
        "today_bookings": today_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "total_bookings": total_bookings,
        "total_reviews": total_reviews,
        "menu_count": menu_count,
        "signature_count": signature_count,
    }

# ============================================================
# STATIC FRONTEND
# ============================================================

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
