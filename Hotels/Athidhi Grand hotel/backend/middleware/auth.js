const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) throw new Error('Invalid token payload');
    req.adminId = decoded.id;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};
