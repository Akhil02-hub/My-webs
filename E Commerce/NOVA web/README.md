# NOVA — Flask + SQLite backend

This package turns the supplied NOVA storefront HTML into a Flask application backed by SQLite.

## Files
- `app.py` — backend, database schema, APIs, admin APIs
- `templates/index.html` — your existing NOVA HTML goes here
- `templates/admin.html` — simple admin dashboard
- `static/js/nova.js` — connects the NOVA UI to the backend
- `requirements.txt` — Flask dependency
- `.env.example` — environment variables
- `nova.db` — SQLite database (created automatically if deleted)

## Setup on Windows
```powershell
cd path\to\nova_backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:NOVA_ADMIN_KEY="use-a-long-random-key"
python app.py
```
Open:
- http://127.0.0.1:5000/
- http://127.0.0.1:5000/admin

## Frontend integration
Keep your original HTML/CSS exactly as provided. Move the large inline `<script>...</script>` block out and replace it with:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<script src="{{ url_for('static', filename='js/nova.js') }}"></script>
```
Do not include the original `const products = [...]` / local cart implementation after adding `nova.js`, because `nova.js` loads products from SQLite through `/api/products`.

## API
Public:
- `GET /api/health`
- `GET /api/products`
- `GET /api/products/<id>`
- `GET /api/categories`
- `POST /api/newsletter` with `{ "email": "you@example.com" }`
- `POST /api/orders` with `{ "customer": {"name":"...","email":"..."}, "items": [{"id":1,"quantity":2}] }`
- `GET /api/orders/<id>`
- `GET /api/favorites?email=you@example.com`
- `POST /api/favorites`
- `DELETE /api/favorites`

Admin routes require `X-Admin-Key` matching `NOVA_ADMIN_KEY`:
- `GET/POST /api/admin/products`
- `PUT/DELETE /api/admin/products/<id>`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/<id>`
- `GET /api/admin/subscribers`

## Important
This does **not** process card payments. `/api/orders` creates an order and reserves stock. A real payment gateway such as Stripe can be added later without rebuilding the product database.
