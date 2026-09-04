from __future__ import annotations

import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request, Response, send_from_directory
from werkzeug.exceptions import RequestEntityTooLarge
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "nova.db"

app = Flask(__name__)
app.config.update(
    JSON_SORT_KEYS=False,
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
)

@app.route("/googlec6fca3da7b3d490f.html")
def google_verification():
    return send_from_directory(
        Path(__file__).parent,
        "googlec6fca3da7b3d490f.html"
    )

@app.route("/sitemap.xml")
def sitemap():
    return Response(
        """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://nova-isq6.onrender.com/</loc>
    </url>
    <url>
        <loc>https://https://nova-isq6.onrender.com/admin</loc>
    </url>
</urlset>""",
        mimetype="application/xml"
    )

DEFAULT_PRODUCTS = [
    (1, "Relaxed Linen Shirt", "Apparel", 78, None, 4.9, 124, "Bestseller", "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=85"),
    (2, "Cloud Everyday Tote", "Accessories", 64, None, 4.8, 86, "New", "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=85"),
    (3, "Studio Cup Set", "Home", 42, 56, 4.7, 61, "Sale", "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=800&q=85"),
    (4, "Form Leather Sneaker", "Footwear", 118, None, 4.9, 208, None, "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=85"),
    (5, "Soft Ribbed Cardigan", "Apparel", 96, None, 4.8, 74, "New", "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=85"),
    (6, "Sculpt Candle No. 02", "Wellness", 36, None, 4.6, 43, None, "https://images.unsplash.com/photo-1602874801006-e26e8e2cc7c1?auto=format&fit=crop&w=800&q=85"),
    (7, "Arc Mini Crossbody", "Accessories", 89, 109, 4.8, 95, "Sale", "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=85"),
    (8, "Woven Lounge Throw", "Home", 72, None, 4.9, 112, "Bestseller", "https://images.unsplash.com/photo-1583845112203-454c2254ed80?auto=format&fit=crop&w=800&q=85"),
]

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ADMIN_KEY = os.getenv("NOVA_ADMIN_KEY", "change-me-now")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    db = db_connect()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL CHECK(price >= 0),
            old_price REAL,
            rating REAL NOT NULL DEFAULT 0,
            reviews INTEGER NOT NULL DEFAULT 0,
            tag TEXT,
            image TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT 100 CHECK(stock >= 0),
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            email TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            subtotal REAL NOT NULL,
            shipping REAL NOT NULL,
            total REAL NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL CHECK(quantity > 0),
            unit_price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_email TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(customer_email, product_id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS site_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        """
    )

    if db.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        db.executemany(
            """
            INSERT INTO products
            (id, name, category, price, old_price, rating, reviews, tag, image, stock, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100, 1, ?)
            """,
            [(*product, now_iso()) for product in DEFAULT_PRODUCTS],
        )

    db.execute("INSERT OR IGNORE INTO site_settings(key, value) VALUES('free_shipping_threshold', '75')")
    db.execute("INSERT OR IGNORE INTO site_settings(key, value) VALUES('shipping_fee', '8')")
    db.execute("INSERT OR IGNORE INTO site_settings(key, value) VALUES('currency', 'USD')")
    db.commit()
    db.close()


def row_dict(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    if "active" in data:
        data["active"] = bool(data["active"])
    return data


def email_valid(value: str) -> bool:
    return bool(EMAIL_RE.match(value.strip().lower()))


def admin_authorized() -> bool:
    return request.headers.get("X-Admin-Key", "") == ADMIN_KEY


def admin_guard():
    if not admin_authorized():
        return jsonify({"error": "Unauthorized"}), 401
    return None


@app.errorhandler(RequestEntityTooLarge)
def too_large(_error):
    return jsonify({"error": "Request is too large."}), 413


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/admin")
def admin_page():
    return render_template("admin.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/products")
def products_list():
    category = request.args.get("category", "All").strip()
    search = request.args.get("search", "").strip().lower()
    sort = request.args.get("sort", "featured")

    db = db_connect()
    sql = "SELECT * FROM products WHERE active=1"
    params: list[Any] = []

    if category and category != "All":
        sql += " AND category=?"
        params.append(category)

    if search:
        like = f"%{search}%"
        sql += " AND (LOWER(name) LIKE ? OR LOWER(category) LIKE ?)"
        params.extend([like, like])

    if sort == "low":
        sql += " ORDER BY price ASC"
    elif sort == "high":
        sql += " ORDER BY price DESC"
    elif sort == "rating":
        sql += " ORDER BY rating DESC, reviews DESC"
    else:
        sql += " ORDER BY CASE tag WHEN 'Bestseller' THEN 0 WHEN 'New' THEN 1 WHEN 'Sale' THEN 2 ELSE 3 END, id ASC"

    rows = db.execute(sql, params).fetchall()
    db.close()
    return jsonify([row_dict(row) for row in rows])


@app.get("/api/products/<int:product_id>")
def product_detail(product_id: int):
    db = db_connect()
    row = db.execute("SELECT * FROM products WHERE id=? AND active=1", (product_id,)).fetchone()
    db.close()
    if not row:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(row_dict(row))


@app.get("/api/categories")
def categories():
    db = db_connect()
    rows = db.execute("SELECT DISTINCT category FROM products WHERE active=1 ORDER BY category").fetchall()
    db.close()
    return jsonify([row["category"] for row in rows])


@app.post("/api/newsletter")
def newsletter():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    if not email_valid(email):
        return jsonify({"error": "Please provide a valid email address."}), 400

    db = db_connect()
    try:
        db.execute("INSERT INTO subscribers(email, created_at) VALUES (?, ?)", (email, now_iso()))
        db.commit()
        message = "Subscribed successfully."
    except sqlite3.IntegrityError:
        message = "This email is already subscribed."
    finally:
        db.close()

    return jsonify({"message": message, "discount_code": "FIRST15"})


@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    customer = data.get("customer") or {}
    items = data.get("items") or []

    if not isinstance(items, list) or not items:
        return jsonify({"error": "Cart is empty."}), 400

    email = str(customer.get("email", "")).strip().lower()
    name = str(customer.get("name", "")).strip()
    if email and not email_valid(email):
        return jsonify({"error": "Invalid customer email."}), 400

    db = db_connect()
    normalized: list[tuple[int, int, float]] = []
    subtotal = 0.0

    try:
        db.execute("BEGIN IMMEDIATE")
        for item in items:
            try:
                product_id = int(item["id"])
                quantity = int(item["quantity"])
            except (KeyError, TypeError, ValueError):
                db.rollback()
                return jsonify({"error": "Invalid cart item."}), 400

            if not 1 <= quantity <= 50:
                db.rollback()
                return jsonify({"error": "Quantity must be between 1 and 50."}), 400

            product = db.execute(
                "SELECT * FROM products WHERE id=? AND active=1",
                (product_id,),
            ).fetchone()
            if not product:
                db.rollback()
                return jsonify({"error": f"Product {product_id} not found."}), 404

            if product["stock"] < quantity:
                db.rollback()
                return jsonify({"error": f"Not enough stock for {product['name']}."}), 409

            subtotal += product["price"] * quantity
            normalized.append((product_id, quantity, float(product["price"])))

        threshold = float(db.execute("SELECT value FROM site_settings WHERE key='free_shipping_threshold'").fetchone()[0])
        shipping_fee = float(db.execute("SELECT value FROM site_settings WHERE key='shipping_fee'").fetchone()[0])
        shipping = 0.0 if subtotal >= threshold else shipping_fee
        total = subtotal + shipping

        cursor = db.execute(
            """
            INSERT INTO orders(customer_name, email, status, subtotal, shipping, total, created_at)
            VALUES (?, ?, 'pending', ?, ?, ?, ?)
            """,
            (name or None, email or None, subtotal, shipping, total, now_iso()),
        )
        order_id = int(cursor.lastrowid)

        for product_id, quantity, unit_price in normalized:
            db.execute(
                "INSERT INTO order_items(order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                (order_id, product_id, quantity, unit_price),
            )
            db.execute("UPDATE products SET stock=stock-? WHERE id=?", (quantity, product_id))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return jsonify(
        {
            "message": "Order created successfully.",
            "order_id": order_id,
            "subtotal": round(subtotal, 2),
            "shipping": round(shipping, 2),
            "total": round(total, 2),
            "status": "pending",
        }
    ), 201


@app.get("/api/orders/<int:order_id>")
def order_detail(order_id: int):
    db = db_connect()
    order = db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if not order:
        db.close()
        return jsonify({"error": "Order not found"}), 404

    items = db.execute(
        """
        SELECT oi.product_id, p.name, p.category, oi.quantity, oi.unit_price
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id=?
        ORDER BY oi.id
        """,
        (order_id,),
    ).fetchall()
    db.close()

    result = dict(order)
    result["items"] = [dict(item) for item in items]
    return jsonify(result)


@app.get("/api/favorites")
def favorites_list():
    email = request.args.get("email", "").strip().lower()
    if not email_valid(email):
        return jsonify({"error": "Valid email is required."}), 400
    db = db_connect()
    rows = db.execute(
        "SELECT product_id FROM favorites WHERE customer_email=? ORDER BY id DESC",
        (email,),
    ).fetchall()
    db.close()
    return jsonify([row["product_id"] for row in rows])


@app.post("/api/favorites")
def favorite_add():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    product_id = data.get("product_id")
    if not email_valid(email):
        return jsonify({"error": "Valid email is required."}), 400
    try:
        product_id = int(product_id)
    except (TypeError, ValueError):
        return jsonify({"error": "Valid product_id is required."}), 400

    db = db_connect()
    if not db.execute("SELECT 1 FROM products WHERE id=?", (product_id,)).fetchone():
        db.close()
        return jsonify({"error": "Product not found."}), 404
    db.execute(
        "INSERT OR IGNORE INTO favorites(customer_email, product_id, created_at) VALUES (?, ?, ?)",
        (email, product_id, now_iso()),
    )
    db.commit()
    db.close()
    return jsonify({"message": "Favorite saved."})


@app.delete("/api/favorites")
def favorite_remove():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    try:
        product_id = int(data.get("product_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid product_id is required."}), 400
    if not email_valid(email):
        return jsonify({"error": "Valid email is required."}), 400

    db = db_connect()
    db.execute("DELETE FROM favorites WHERE customer_email=? AND product_id=?", (email, product_id))
    db.commit()
    db.close()
    return jsonify({"message": "Favorite removed."})


@app.get("/api/admin/products")
def admin_products():
    denied = admin_guard()
    if denied:
        return denied
    db = db_connect()
    rows = db.execute("SELECT * FROM products ORDER BY id").fetchall()
    db.close()
    return jsonify([row_dict(row) for row in rows])


@app.post("/api/admin/products")
def admin_product_create():
    denied = admin_guard()
    if denied:
        return denied
    data = request.get_json(silent=True) or {}
    required = ["name", "category", "price", "image"]
    missing = [key for key in required if data.get(key) in (None, "")]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        price = float(data["price"])
        stock = int(data.get("stock", 100))
        rating = float(data.get("rating", 0))
        reviews = int(data.get("reviews", 0))
        old_price = None if data.get("old_price") in (None, "") else float(data["old_price"])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric field."}), 400

    if min(price, stock, rating, reviews) < 0:
        return jsonify({"error": "Numeric fields cannot be negative."}), 400

    db = db_connect()
    cursor = db.execute(
        """
        INSERT INTO products(name, category, price, old_price, rating, reviews, tag, image, stock, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            str(data["name"]).strip(),
            str(data["category"]).strip(),
            price,
            old_price,
            rating,
            reviews,
            data.get("tag"),
            str(data["image"]).strip(),
            stock,
            1 if data.get("active", True) else 0,
            now_iso(),
        ),
    )
    db.commit()
    product_id = int(cursor.lastrowid)
    db.close()
    return jsonify({"message": "Product created.", "id": product_id}), 201


@app.put("/api/admin/products/<int:product_id>")
def admin_product_update(product_id: int):
    denied = admin_guard()
    if denied:
        return denied
    data = request.get_json(silent=True) or {}
    allowed = {"name", "category", "price", "old_price", "rating", "reviews", "tag", "image", "stock", "active"}
    updates = {key: data[key] for key in allowed if key in data}
    if not updates:
        return jsonify({"error": "No fields to update."}), 400

    numeric_fields = {"price": float, "old_price": float, "rating": float, "reviews": int, "stock": int}
    try:
        for field, caster in numeric_fields.items():
            if field in updates and updates[field] not in (None, ""):
                updates[field] = caster(updates[field])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric field."}), 400

    db = db_connect()
    exists = db.execute("SELECT 1 FROM products WHERE id=?", (product_id,)).fetchone()
    if not exists:
        db.close()
        return jsonify({"error": "Product not found."}), 404

    assignment = ", ".join(f"{field}=?" for field in updates)
    db.execute(f"UPDATE products SET {assignment} WHERE id=?", [*updates.values(), product_id])
    db.commit()
    db.close()
    return jsonify({"message": "Product updated."})


@app.delete("/api/admin/products/<int:product_id>")
def admin_product_archive(product_id: int):
    denied = admin_guard()
    if denied:
        return denied
    db = db_connect()
    cursor = db.execute("UPDATE products SET active=0 WHERE id=?", (product_id,))
    db.commit()
    db.close()
    if cursor.rowcount == 0:
        return jsonify({"error": "Product not found."}), 404
    return jsonify({"message": "Product archived."})


@app.get("/api/admin/orders")
def admin_orders():
    denied = admin_guard()
    if denied:
        return denied
    db = db_connect()
    orders = db.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
    result = []
    for order in orders:
        items = db.execute(
            """
            SELECT oi.product_id, p.name, oi.quantity, oi.unit_price
            FROM order_items oi JOIN products p ON p.id=oi.product_id
            WHERE oi.order_id=? ORDER BY oi.id
            """,
            (order["id"],),
        ).fetchall()
        data = dict(order)
        data["items"] = [dict(item) for item in items]
        result.append(data)
    db.close()
    return jsonify(result)


@app.patch("/api/admin/orders/<int:order_id>")
def admin_order_status(order_id: int):
    denied = admin_guard()
    if denied:
        return denied
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).strip().lower()
    allowed_statuses = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
    if status not in allowed_statuses:
        return jsonify({"error": f"Status must be one of: {', '.join(sorted(allowed_statuses))}"}), 400

    db = db_connect()
    cursor = db.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    db.commit()
    db.close()
    if cursor.rowcount == 0:
        return jsonify({"error": "Order not found."}), 404
    return jsonify({"message": "Order status updated."})


@app.get("/api/admin/subscribers")
def admin_subscribers():
    denied = admin_guard()
    if denied:
        return denied
    db = db_connect()
    rows = db.execute("SELECT * FROM subscribers ORDER BY id DESC").fetchall()
    db.close()
    return jsonify([dict(row) for row in rows])


with app.app_context():
    init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "1") == "1")
