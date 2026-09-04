# Meridian University

A modern, responsive university website built with **HTML, Tailwind CSS, JavaScript, GSAP, Lenis, FastAPI, and Python**.

Meridian University is presented as a premium private research university website with an elegant academic design, animated interactions, admissions functionality, newsletter subscription, and email integration.

## ✨ Features

* 🎓 Premium university landing page
* 📱 Fully responsive design
* 🎨 Tailwind CSS styling
* ✨ GSAP animations and ScrollTrigger effects
* 🖱️ Custom animated cursor
* 🌀 Smooth scrolling with Lenis
* 🏫 Academics and school information
* 🔬 Research & impact section
* 🏀 Campus life section
* 📰 News and events section
* ❓ Interactive FAQ
* 📝 Online application form
* 📧 Application email notifications
* 📬 Newsletter subscription
* ⚡ FastAPI backend
* ❤️ Responsive mobile navigation
* 🎞️ Animated preloader and page transitions

## 🛠️ Tech Stack

### Frontend

* HTML5
* Tailwind CSS
* JavaScript
* GSAP
* GSAP ScrollTrigger
* Lenis
* Google Fonts

### Backend

* Python
* FastAPI
* Pydantic
* Uvicorn
* Python-dotenv

### Email

* Custom Python email service
* SMTP-based email delivery

## 📁 Project Structure

```text
Meridian University/
│
├── frontend/
│   └── index.html
│
├── main.py
├── email_service.py
├── requirements.txt
├── README.md
└── .gitignore
```

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd "Meridian University"
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file if your email service requires environment variables.

Example:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@example.com
```

Do **not** commit your `.env` file to GitHub.

### 4. Start the server

```bash
uvicorn main:app --reload
```

### 5. Open the website

```text
http://127.0.0.1:8000/
```

## 🔌 API Endpoints

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

### Application

```http
POST /api/apply
```

Accepts applicant information and sends the application through the configured email service.

### Newsletter

```http
POST /api/newsletter
```

Accepts an email address for newsletter subscription.

## 🌐 Deployment

The project can be deployed on platforms that support Python/FastAPI applications, such as **Render**.

### Render Configuration

```text
Build Command:
pip install -r requirements.txt
```

```text
Start Command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The application serves the frontend from:

```text
/frontend/index.html
```

through the FastAPI root route:

```text
GET /
```

## 🔐 Security

* Environment variables are used for sensitive configuration.
* `.env` should not be committed.
* Form honeypot fields help reduce automated spam submissions.
* Email credentials should remain server-side.

## 📸 Design

The design uses a refined academic aesthetic with:

* Deep green tones
* Warm parchment backgrounds
* Gold accent colors
* Serif typography
* Large editorial-style headings
* Smooth motion and transitions

## 📜 Disclaimer

Meridian University is a fictional university created as a web-development project. University names, statistics, people, events, locations, and other institutional information shown on the website are fictional/demo content.

## 👨‍💻 Author

**Akhil**

Built as a full-stack web development project combining a modern frontend experience with a Python FastAPI backend.

---

⭐ If you like the project, consider giving the repository a star.