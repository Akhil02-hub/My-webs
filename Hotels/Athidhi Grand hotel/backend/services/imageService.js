const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const useCloudinary = String(process.env.USE_CLOUDINARY).toLowerCase() === 'true';

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

function validateCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is enabled but its credentials are incomplete.');
  }
}

exports.uploadImage = async (localPath, folder) => {
  if (!localPath) throw new Error('Image file path is missing.');

  if (useCloudinary) {
    validateCloudinaryConfig();
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        folder: `athidhi-grand/${folder}`,
        resource_type: 'image'
      });
      return { url: result.secure_url, publicId: result.public_id };
    } finally {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
  }

  const targetFolder = path.join(__dirname, '../uploads', folder);
  fs.mkdirSync(targetFolder, { recursive: true });
  const filename = `${path.basename(localPath, path.extname(localPath))}.webp`;
  const targetPath = path.join(targetFolder, filename);

  try {
    fs.renameSync(localPath, targetPath);
    return { url: filename, publicId: null };
  } catch (error) {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    throw error;
  }
};

exports.deleteImage = async (imageObj, folder) => {
  if (!imageObj) return;
  const { url, publicId } = imageObj;

  if (useCloudinary) {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
    }
    return;
  }

  // Never delete built-in public assets such as /hero.svg.
  if (!url || url.startsWith('/')) return;

  const filePath = path.join(__dirname, '../uploads', folder, path.basename(url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};
