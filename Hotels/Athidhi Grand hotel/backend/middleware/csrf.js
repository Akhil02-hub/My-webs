const crypto = require('crypto');

const METHODS_REQUIRING_CSRF = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getSameSite() {
  const value = String(process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  return ['lax', 'strict', 'none'].includes(value) ? value : 'lax';
}

function getCookieOptions() {
  const sameSite = getSameSite();
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/'
  };
}

function ensureToken(req, res) {
  let token = req.cookies?.['XSRF-TOKEN'];
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie('XSRF-TOKEN', token, getCookieOptions());
  }
  return token;
}

exports.getSameSite = getSameSite;
exports.getCookieOptions = getCookieOptions;
exports.createCsrfToken = () => crypto.randomBytes(32).toString('hex');

exports.csrfProtection = (req, res, next) => {
  const token = ensureToken(req, res);

  if (!METHODS_REQUIRING_CSRF.has(req.method)) return next();

  const header = req.get('X-XSRF-TOKEN') || req.get('X-CSRF-Token');
  if (!header || !token || header !== token) {
    return res.status(403).json({ success: false, message: 'CSRF token invalid' });
  }

  return next();
};

exports.csrfErrorHandler = (err, req, res, next) => {
  if (err?.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'CSRF token missing or invalid' });
  }
  return next(err);
};
