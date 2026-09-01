const rateLimit = require('express-rate-limit');

const common = {
  standardHeaders: true,
  legacyHeaders: false
};

exports.bookingLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many booking requests. Please try again later.' }
});

exports.loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});
