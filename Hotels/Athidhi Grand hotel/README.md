# Athidhi Grand Lodge — Rebuilt Full-Stack Project

## Stack
- Frontend: React 18 + Vite + Tailwind CSS + React Router + Axios
- Backend: Node.js + Express + MongoDB/Mongoose
- Images: local filesystem in development or Cloudinary in production
- Admin auth: JWT in an HttpOnly cookie
- CSRF: double-submit `XSRF-TOKEN` cookie + request header

## Local development

### 1. Backend
```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm run dev
```
On macOS/Linux use `cp .env.example .env` instead of `copy`.

Set a JWT secret of at least 32 characters. Start MongoDB first.

### 2. Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```
Then open http://localhost:5173.

## Production
- Use MongoDB Atlas or another managed MongoDB deployment.
- Use HTTPS.
- Set `FRONTEND_URL` to the exact public frontend origin.
- If frontend/backend are cross-site, set `COOKIE_SAME_SITE=none`.
- Set `USE_CLOUDINARY=true` and all three Cloudinary credentials when using Cloudinary.
- Replace `yourdomain.com` in `public/robots.txt` and `public/sitemap.xml`.
- Build the frontend with `npm run build` and deploy `dist/`.

## Important deployment note
The booking conflict protection serializes room checks inside a single Node.js process. For multiple backend replicas, put the confirmation path behind a distributed lock or move reservation allocation to a MongoDB transaction/reservation model so concurrent replicas cannot overbook the same room inventory.

## Default image assets
Default assets `hero.svg` and `placeholder.svg` are already included in `frontend/public/ to `frontend/public/` before deployment. The backend's `/uploads/*` directory is for uploaded images only.
