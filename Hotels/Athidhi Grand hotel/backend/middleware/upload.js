const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOAD_ROOT, 'temp');
const FINAL_DIRS = ['rooms', 'gallery', 'hero'];

for (const dir of [TEMP_DIR, ...FINAL_DIRS.map(name => path.join(UPLOAD_ROOT, name))]) {
  fs.mkdirSync(dir, { recursive: true });
}

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
    return cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'));
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

const processImage = async (req, res, next) => {
  if (!req.file) return next();

  const tempFile = path.join(TEMP_DIR, `${crypto.randomUUID()}.webp`);
  try {
    await sharp(req.file.buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(tempFile);

    req.file.localPath = tempFile;
    return next();
  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return next(error);
  }
};

module.exports = { upload, processImage, UPLOAD_ROOT };
