const fs = require('fs');

exports.catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

exports.errorHandler = (err, req, res, next) => {
  if (req.file?.localPath && fs.existsSync(req.file.localPath)) {
    try { fs.unlinkSync(req.file.localPath); } catch {}
  }

  console.error(err?.stack || err);

  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image is too large. Maximum size is 5 MB.'
      : 'Upload failed.';
    return res.status(400).json({ success: false, message });
  }

  const status = Number(err?.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message = safeStatus === 500 ? 'Internal server error.' : (err?.message || 'Request failed.');

  return res.status(safeStatus).json({ success: false, message });
};
