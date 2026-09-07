# Atelier & Co. — Invitations & Websites Studio

A full-stack site for an invitations + website designer: a public site (3D animated
hero, invitations catalogue, websites showcase, project-request form, ratings &
reviews) plus a password-protected admin panel for full CRUD control.

Stack: **HTML / CSS / vanilla JS** (frontend, three.js from CDN for the 3D hero)
+ **Python (FastAPI) / SQLite** (backend). No other frameworks.

## 1. Install & run

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open:
- Public site → http://localhost:8000/
- Admin panel → http://localhost:8000/admin

The database (`backend/studio.db`) and an `admin_password_hash` are created
automatically on first run, seeded with sample invitations, websites, and copy.

## 2. Default admin login

**Password: `ChangeMe123!`**

Change it immediately from **Admin → Site settings → Change admin password**,
or set an env var before first run to seed a different one:

```bash
ADMIN_PASSWORD="your-new-password" uvicorn main:app --reload --port 8000
```

(Only takes effect the *first* time the database is created — after that,
change it from the admin panel.)

## 3. What's editable from the admin panel

- **Invitations** — add/edit/delete cards, set type (Classic / Animated), price,
  description, card image, preview image, and the purchase link (for animated
  cards this is where you paste the link to the delivered HTML file/code).
- **Websites** — add/edit/delete showcase entries: title, category (categories
  are auto-derived from what you type, and appear as the draggable pill rail
  on the public site), preview **video** upload, and the live website URL.
- **Reviews** — approve or delete reviews submitted by visitors.
- **Project requests** — see every "Do a Project" form submission, mark as
  handled, or delete.
- **Site settings** — logo upload, site name, hero headline/subheadline, the
  invitations quote, the websites quote, and the Instagram URL used by every
  "Purchase" button under a website card.

## 4. How the public site maps to the brief

- **3 hero buttons** → Invitations / Websites / Do a Project, each scrolls to
  its section and reveals a quote paragraph (editable in admin).
- **Invitations** → two tabs, *Classic Cards (no effects)* and *Animated
  Invitations*; every card has **Preview** (opens a modal) and **Purchase**
  (opens the purchase link you set in admin — for animated cards, point this
  at your delivered HTML/code link).
- **Websites** → quote, then a horizontally **draggable** category rail, then
  a grid of website cards. Each card shows a **video**, not a photo, plus
  **Live website** (opens the real live URL) and **Purchase** (opens your
  Instagram, from settings).
- **Do a project** → a contact-brief form, stored in the admin panel.
- **Reviews** → average rating + star reviews, with a public submission form
  (new reviews are held as "pending" until approved in admin).
- **3D + motion** → a three.js hero scene (floating card planes with mouse
  parallax) plus a single orchestrated entrance animation on load, a full-page
  loader, hover/scroll transitions throughout.
- **Admin** → password-protected (token-based session), full CRUD on every
  content type, plus logo/quote editing.

## 5. Notes & next steps

- Sample content uses placeholder SVG "cards" and no real preview videos —
  replace them from the admin panel once you have real photography/video.
- Uploads are stored under `frontend/uploads/` and served at `/uploads/...`.
- For production: put this behind HTTPS, move the admin password out of the
  default, and consider a proper session/JWT store instead of the in-memory
  token set (fine for a single-server small-business deployment, but tokens
  reset if the server restarts).
