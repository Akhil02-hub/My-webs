# Meridian Website

Static frontend with two forms (Apply, Newsletter) that POST to a FastAPI
backend. The backend emails each submission via SMTP — there is no database
or file storage. Your inbox is the record of submissions.

## Project structure

```
meridian/
├── frontend/
│   └── index.html        ← your HTML, unchanged (forms wired to fetch())
├── backend/
│   ├── main.py            ← FastAPI app, form endpoints, validation
│   ├── email_service.py   ← builds and sends the emails over SMTP
│   └── requirements.txt
├── .env                   ← SMTP credentials & allowed origins (never commit)
├── .gitignore
└── README.md
```

## Requirements

- Python 3.9+
- An SMTP account to send from (Gmail, SendGrid SMTP relay, your host's SMTP, etc.)

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Fill in `.env` (in the project root) with real values:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   TO_EMAIL=your-email@gmail.com
   ALLOWED_ORIGINS=http://localhost:5500,https://your-production-domain.com
   ```

   **Gmail users:** you need an "App Password", not your normal login
   password. Turn on 2-Step Verification, then generate one at
   Google Account → Security → App passwords.

3. Run the backend:

   ```bash
   uvicorn main:app --reload
   ```

   The API is now available at `http://localhost:8000`.

4. Open `frontend/index.html` (e.g. with the VS Code "Live Server"
   extension, usually on `http://localhost:5500`) and submit a form to
   test end to end.

## API endpoints

| Method | Path              | Body                                                        |
|--------|-------------------|--------------------------------------------------------------|
| POST   | `/api/apply`      | `name`, `email`, `phone?`, `position?`, `message?`, `website?` (honeypot) |
| POST   | `/api/newsletter` | `email`, `website?` (honeypot)                                |
| GET    | `/api/health`     | —                                                              |

A successful call returns `{"status": "ok"}`. Validation errors return
`422`; email-sending failures return `500`.

## Spam protection

Both forms include a hidden `website` field. Real visitors never fill it
in (it's hidden via CSS); if it arrives non-empty, the backend silently
discards the submission instead of emailing it. No extra service or
database needed.

## Deploying

- Host the backend anywhere that runs Python (Render, Railway, a VPS, etc.).
- Update `ALLOWED_ORIGINS` in `.env` to your live frontend domain.
- Update the `fetch()` URLs in `index.html` to point at your deployed
  backend URL instead of `localhost:8000`.
- Never commit `.env` — it's already in `.gitignore`.

## Notes

- There is no database: submissions exist only as emails in `TO_EMAIL`'s
  inbox. If you ever need a searchable record, look at storing to
  something like Google Sheets via a webhook, or add SQLite later.