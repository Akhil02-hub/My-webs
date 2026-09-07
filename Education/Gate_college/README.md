# GATE Kodad — Gandhi Academy of Technical Education

Premium responsive college website for GATE Kodad with a FastAPI backend and SMTP enquiry delivery.

## Structure

```text
GATE_Kodad/
├── frontend/
│   └── index.html
├── main.py
├── email_service.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Public details used

- Gandhi Academy of Technical Education (GATE)
- Kattakommagudam (V), Chilkur (M), Kodad (Post), Suryapet District, Telangana – 508206
- Phone: +91 98484 21753
- Email: principal.qe@gmail.com
- Website: https://gatekodad.co.in
- Engineering establishment year reported in public college records: 2008

## Premium features

- Responsive premium UI
- Animated hero and scroll reveals
- Glassmorphism sticky enquiry CTA
- GATE Kodad campus imagery
- Engineering/program showcase
- Campus updates/events section
- Google Maps location link/embed
- Quick enquiry form connected to FastAPI
- Pydantic validation
- Honeypot anti-spam field
- SMTP email notifications
- API health check
- Local + Render-compatible relative API routes

## Local run

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Open:

```text
http://127.0.0.1:8000/
```

Docs:

```text
http://127.0.0.1:8000/docs
```

Health:

```text
http://127.0.0.1:8000/api/health
```

## Render

Build:

```text
pip install -r requirements.txt
```

Start:

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Keep the Render Root Directory at the repository root.

## Environment

Copy `.env.example` to `.env` locally and set your real SMTP credentials. Never commit `.env`.

## API

```text
GET  /
GET  /api/health
POST /api/admission
POST /api/newsletter
```

## Sources

Government of Telangana Suryapet District college directory:
https://suryapet.telangana.gov.in/public-utility-category/colleges/

GATE Kodad contact information:
https://www.ssesgi.ac.in/contact.html

GATE Kodad CSE information:
https://www.ssesgi.ac.in/cse.html

GATE Kodad CSE (AI & ML):
https://ssesgi.ac.in/cseai.html

Public GATE Kodad campus gallery:
https://www.collegebatch.com/4402-gandhi-academy-of-technical-education-campus-tour-nalgonda-fs05

Verify current courses, fees, intake, admissions and contact details with the institution before production use.
