# AkhilWebInvites — Flask Backend

This converts the localStorage-only architecture into a real shared backend.

## Included
- Flask + SQLite persistence
- Secure hashed admin passwords
- Server-side session authentication
- No hardcoded/default password shown in the admin UI
- Shared branding, invitations and websites API
- Image upload endpoints (PNG/JPG/JPEG/WebP/GIF, max 8 MB)
- URL validation for logos/live demos
- Password change
- Health endpoint
- Instagram "Reserve a Conversation" destination: https://ig.me/m/websbyakhil

## First run
1. Create a virtual environment.
2. Install `pip install -r requirements.txt`.
3. Copy `.env.example` to `.env` and set `SECRET_KEY` and `ADMIN_INITIAL_PASSWORD`.
4. Export those variables in your shell, then run `python app.py`.
5. Open `/` for the public site and `/admin` for admin login.

For Render, use:
- Build: `pip install -r requirements.txt`
- Start: `gunicorn app:app`

Important: on a platform with an ephemeral filesystem, uploaded files and SQLite data need persistent storage or an external database/object store for durable production data.
