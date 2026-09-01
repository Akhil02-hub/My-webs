const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const auth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { catchAsync } = require('../middleware/errorHandler');
const { createCsrfToken, getCookieOptions } = require('../middleware/csrf');

function normalizeUsername(value) {
  return String(value || '').trim();
}

router.post('/login', loginLimiter, catchAsync(async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || '');

  if (username.length < 3 || username.length > 50 || password.length < 8 || password.length > 200) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const admin = await Admin.findOne({ username }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const cookieOptions = getCookieOptions();
  const csrfToken = createCsrfToken();

  res.cookie('token', token, {
    ...cookieOptions,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.cookie('XSRF-TOKEN', csrfToken, cookieOptions);

  return res.json({ success: true, message: 'Logged in', csrfToken });
}));

router.post('/logout', auth, (req, res) => {
  const cookieOptions = getCookieOptions();
  res.clearCookie('token', { ...cookieOptions, httpOnly: true });
  res.clearCookie('XSRF-TOKEN', cookieOptions);
  return res.json({ success: true, message: 'Logged out' });
});

router.get('/check', auth, (req, res) => {
  res.json({ success: true, message: 'Authenticated' });
});

module.exports = router;
