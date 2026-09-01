const router = require('express').Router();
const mongoose = require('mongoose');
const GalleryImage = require('../models/GalleryImage');
const auth = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');
const imageService = require('../services/imageService');
const { catchAsync } = require('../middleware/errorHandler');

const CATEGORIES = new Set(['property', 'food', 'pool', 'surroundings']);

router.get('/', catchAsync(async (req, res) => {
  const images = await GalleryImage.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: images });
}));

router.post('/', auth, upload.single('image'), processImage, catchAsync(async (req, res) => {
  if (!req.file?.localPath) return res.status(400).json({ success: false, message: 'No image provided.' });

  const title = String(req.body.title || '').trim();
  const category = String(req.body.category || 'property').trim();
  if (title.length > 100) return res.status(400).json({ success: false, message: 'Title cannot exceed 100 characters.' });
  if (!CATEGORIES.has(category)) return res.status(400).json({ success: false, message: 'Invalid gallery category.' });

  const uploadResult = await imageService.uploadImage(req.file.localPath, 'gallery');
  req.file.localPath = null;
  const image = await GalleryImage.create({ title: title || undefined, category, image: uploadResult });
  return res.status(201).json({ success: true, data: image });
}));

router.delete('/:id', auth, catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid image ID.' });
  }

  const image = await GalleryImage.findById(req.params.id);
  if (!image) return res.status(404).json({ success: false, message: 'Image not found.' });
  await imageService.deleteImage(image.image, 'gallery');
  await image.deleteOne();
  return res.json({ success: true, message: 'Image deleted.' });
}));

module.exports = router;
