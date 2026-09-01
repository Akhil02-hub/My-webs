require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { errorHandler } = require('./middleware/errorHandler');
const { csrfProtection, csrfErrorHandler } = require('./middleware/csrf');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const galleryRoutes = require('./routes/gallery');
const bookingRoutes = require('./routes/bookings');
const siteRoutes = require('./routes/site');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL?.trim();

if (!FRONTEND_URL) {
  console.error('FRONTEND_URL environment variable is required.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and contain at least 32 characters.');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI environment variable is required.');
  process.exit(1);
}

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://maps.googleapis.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      frameSrc: ["'self'", 'https://www.google.com'],
      connectSrc: ["'self'", 'https://res.cloudinary.com']
    }
  }
}));

app.use(compression());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-XSRF-TOKEN', 'X-CSRF-Token']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Double-submit CSRF protection. Login and health are intentionally public.
app.use((req, res, next) => {
  if (req.path === '/api/admin/login' || req.path === '/api/health') return next();
  return csrfProtection(req, res, next);
});
app.use(csrfErrorHandler);

app.get('/api/csrf', (req, res) => {
  res.json({ success: true, csrfToken: req.cookies?.['XSRF-TOKEN'] || null });
});

const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  index: false,
  fallthrough: false,
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

app.use('/api/admin', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/health', healthRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const server = app.listen(PORT, () => {
      console.log(`Athidhi Grand API running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        try {
          await mongoose.connection.close(false);
          console.log('MongoDB connection closed.');
          process.exit(0);
        } catch (error) {
          console.error('Shutdown error:', error);
          process.exit(1);
        }
      });
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

start();
