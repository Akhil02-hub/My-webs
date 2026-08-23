import os
import sqlite3
from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Foodies API",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "dhaba.db"
)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db_connection()
    cursor = conn.cursor()

    # --------------------------------------------------------
    # MENU
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # SIGNATURE FAVOURITES
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # BOOKINGS
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            guests INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --------------------------------------------------------
    # REVIEWS
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            comment TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --------------------------------------------------------
    # GALLERY
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS gallery_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT DEFAULT '',
            category TEXT DEFAULT 'Food',
            image TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --------------------------------------------------------
    # SITE SETTINGS
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    conn.commit()
    conn.close()


init_db()


# ============================================================
# ADMIN KEY PROTECTION
# ============================================================

ADMIN_KEY = os.getenv("ADMIN_KEY", "FoodiesAdmin2024!")

def verify_admin_key(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")


class AdminVerify(BaseModel):
    key: str

@app.post("/api/admin-verify")
async def verify_admin(verify: AdminVerify):
    if verify.key == ADMIN_KEY:
        return {"valid": True}
    raise HTTPException(status_code=403, detail="Invalid key")


# ============================================================
# PYDANTIC MODELS
# ============================================================


# -------------------- MENU --------------------

class MenuItemCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = ""
    price: float
    veg: bool = True
    popular: bool = False
    chef_special: bool = False
    available: bool = True
    image: Optional[str] = ""


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    veg: Optional[bool] = None
    popular: Optional[bool] = None
    chef_special: Optional[bool] = None
    available: Optional[bool] = None
    image: Optional[str] = None


# -------------------- SIGNATURE FAVOURITES --------------------

class SignatureFavouriteCreate(BaseModel):
    name: str
    category: str = ""
    description: str = ""
    price: float
    image: Optional[str] = ""


class SignatureFavouriteUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None


# -------------------- BOOKINGS --------------------

class BookingCreate(BaseModel):
    name: str
    phone: str
    guests: int
    date: str
    time: str
    notes: Optional[str] = ""


class BookingUpdate(BaseModel):
    status: str


# -------------------- REVIEWS --------------------

class ReviewCreate(BaseModel):
    name: str
    rating: int
    comment: str


# -------------------- GALLERY --------------------

class GalleryCreate(BaseModel):
    label: str = ""
    category: str = "Food"
    image: str


# -------------------- ABOUT --------------------

class AboutImageUpdate(BaseModel):
    image: Optional[str] = None


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ============================================================
# MENU API
# ============================================================

@app.get("/api/menu")
async def get_menu(
    category: Optional[str] = None,
    search: Optional[str] = None
):

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT *
        FROM menu_items
        WHERE 1=1
    """

    params = []

    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)

    if search:
        query += """
            AND (
                name LIKE ?
                OR description LIKE ?
            )
        """
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    query += " ORDER BY id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


@app.post("/api/menu", dependencies=[Depends(verify_admin_key)])
async def create_menu_item(item: MenuItemCreate):

    if not item.name.strip():
        raise HTTPException(status_code=400, detail="Menu item name is required")

    if item.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO menu_items
        (name, category, description, price, veg, popular, chef_special, available, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item.name,
        item.category,
        item.description,
        item.price,
        int(item.veg),
        int(item.popular),
        int(item.chef_special),
        int(item.available),
        item.image or ""
    ))

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

    if "price" in data and data["price"] is not None and data["price"] < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    conn = get_db_connection()
    cursor = conn.cursor()

    fields = []
    values = []
    for key, value in data.items():
        if key in ["veg", "popular", "chef_special", "available"]:
            value = int(value) if value is not None else None
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
# SIGNATURE FAVOURITES API
# ============================================================

@app.get("/api/signature-favourites")
async def get_signature_favourites():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM signature_favourites ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/signature-favourites", dependencies=[Depends(verify_admin_key)])
async def create_signature_favourite(item: SignatureFavouriteCreate):

    if not item.name.strip():
        raise HTTPException(status_code=400, detail="Signature Favourite name is required")

    if item.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO signature_favourites (name, category, description, price, image)
        VALUES (?, ?, ?, ?, ?)
    """, (item.name, item.category, item.description, item.price, item.image or ""))

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

    if "price" in data and data["price"] is not None and data["price"] < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    conn = get_db_connection()
    cursor = conn.cursor()

    fields = []
    values = []
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


# ============================================================
# FEATURED API
# ============================================================

@app.get("/api/featured")
async def get_featured():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM signature_favourites ORDER BY id DESC LIMIT 6").fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ============================================================
# BOOKINGS API
# ============================================================

@app.post("/api/bookings")  # No admin key needed for public booking
async def create_booking(booking: BookingCreate):

    if booking.guests <= 0:
        raise HTTPException(status_code=400, detail="Guests must be greater than zero")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO bookings (name, phone, guests, date, time, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (booking.name, booking.phone, booking.guests, booking.date, booking.time, booking.notes))

    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "name": booking.name,
        "phone": booking.phone,
        "guests": booking.guests,
        "date": booking.date,
        "time": booking.time,
        "notes": booking.notes,
        "status": "Pending",
        "created_at": datetime.now().isoformat()
    }


@app.get("/api/bookings")
async def get_bookings():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM bookings ORDER BY date DESC, time DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.patch("/api/bookings/{id}", dependencies=[Depends(verify_admin_key)])
async def update_booking(id: int, update: BookingUpdate):

    allowed_statuses = {"Pending", "Confirmed", "Cancelled"}
    if update.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid booking status")

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
# REVIEWS API
# ============================================================

@app.get("/api/reviews")
async def get_reviews():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM reviews ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/reviews")  # No admin key for public reviews
async def create_review(review: ReviewCreate):

    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO reviews (name, rating, comment) VALUES (?, ?, ?)",
                   (review.name, review.rating, review.comment))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {
        "id": new_id,
        "name": review.name,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now().isoformat()
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
# GALLERY API
# ============================================================

@app.get("/api/gallery")
async def get_gallery():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM gallery_items ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/gallery", dependencies=[Depends(verify_admin_key)])
async def add_gallery_item(item: GalleryCreate):

    if not item.image:
        raise HTTPException(status_code=400, detail="Image is required")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO gallery_items (label, category, image) VALUES (?, ?, ?)",
                   (item.label, item.category, item.image))
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
# ABOUT US IMAGE API
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
    conn.execute("""
        INSERT INTO site_settings (key, value)
        VALUES ('about_image', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (update.image or "",))
    conn.commit()
    conn.close()
    return {"image": update.image or ""}


# ============================================================
# STATS API
# ============================================================

@app.get("/api/stats")
async def get_stats():

    conn = get_db_connection()
    cursor = conn.cursor()

    today = date.today().isoformat()

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE date = ?", (today,))
    today_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Pending'")
    pending_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings WHERE status = 'Confirmed'")
    confirmed_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM bookings")
    total_bookings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reviews")
    total_reviews = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM menu_items")
    menu_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM signature_favourites")
    signature_count = cursor.fetchone()[0]

    conn.close()

    return {
        "today_bookings": today_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "total_bookings": total_bookings,
        "total_reviews": total_reviews,
        "menu_count": menu_count,
        "signature_count": signature_count
    }


# ============================================================
# STATIC FRONTEND
# ============================================================

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")