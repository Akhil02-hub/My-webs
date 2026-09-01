const router = require('express').Router();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { upload, processImage } = require('../middleware/upload');
const imageService = require('../services/imageService');
const { catchAsync } = require('../middleware/errorHandler');

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseAmenities(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item).trim()).filter(Boolean).slice(0, 20);
}

function validateRoomPayload(body, partial = false) {
  const errors = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 100) errors.push('Room name is required and must be 1-100 characters.');
  }
  if (!partial || has('description')) {
    if (typeof body.description !== 'string' || body.description.trim().length < 1 || body.description.trim().length > 500) errors.push('Description is required and must be 1-500 characters.');
  }
  if (!partial || has('pricePerNight')) {
    const price = Number(body.pricePerNight);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) errors.push('Invalid price per night.');
  }
  if (has('amenities') && !Array.isArray(body.amenities)) errors.push('Amenities must be an array.');
  if (has('isAvailable') && typeof body.isAvailable !== 'boolean') errors.push('isAvailable must be boolean.');
  if (!partial || has('totalUnits')) {
    const units = Number(body.totalUnits);
    if (!Number.isInteger(units) || units < 1 || units > 100) errors.push('Total units must be an integer from 1 to 100.');
  }
  return errors;
}

router.get('/', catchAsync(async (req, res) => {
  const rooms = await Room.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: rooms });
}));

router.get('/:id', catchAsync(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room ID.' });
  const room = await Room.findById(req.params.id).lean();
  if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
  return res.json({ success: true, data: room });
}));

router.post('/', auth, catchAsync(async (req, res) => {
  const errors = validateRoomPayload(req.body);
  if (errors.length) return res.status(400).json({ success: false, message: errors[0] });

  const room = await Room.create({
    name: req.body.name.trim(),
    description: req.body.description.trim(),
    pricePerNight: Number(req.body.pricePerNight),
    amenities: parseAmenities(req.body.amenities),
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
    totalUnits: Number(req.body.totalUnits)
  });

  return res.status(201).json({ success: true, data: room });
}));

router.put('/:id', auth, catchAsync(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room ID.' });
  const errors = validateRoomPayload(req.body, true);
  if (errors.length) return res.status(400).json({ success: false, message: errors[0] });

  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

  if (req.body.name !== undefined) room.name = req.body.name.trim();
  if (req.body.description !== undefined) room.description = req.body.description.trim();
  if (req.body.pricePerNight !== undefined) room.pricePerNight = Number(req.body.pricePerNight);
  if (req.body.amenities !== undefined) room.amenities = parseAmenities(req.body.amenities);
  if (req.body.isAvailable !== undefined) room.isAvailable = req.body.isAvailable;
  if (req.body.totalUnits !== undefined) room.totalUnits = Number(req.body.totalUnits);

  await room.save();
  return res.json({ success: true, data: room });
}));

router.delete('/:id', auth, catchAsync(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room ID.' });
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

  for (const image of room.images) await imageService.deleteImage(image, 'rooms');
  await room.deleteOne();
  return res.json({ success: true, message: 'Room deleted.' });
}));

router.post('/:id/images', auth, upload.single('image'), processImage, catchAsync(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid room ID.' });
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
  if (!req.file?.localPath) return res.status(400).json({ success: false, message: 'No image provided.' });
  if (room.images.length >= 20) return res.status(400).json({ success: false, message: 'A room can have at most 20 images.' });

  const uploadResult = await imageService.uploadImage(req.file.localPath, 'rooms');
  req.file.localPath = null;
  room.images.push(uploadResult);
  await room.save();
  return res.json({ success: true, data: room });
}));

router.delete('/:id/images/:imageId', auth, catchAsync(async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.imageId)) {
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  }
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

  const imageIndex = room.images.findIndex(image => image._id.toString() === req.params.imageId);
  if (imageIndex === -1) return res.status(404).json({ success: false, message: 'Image not found.' });

  await imageService.deleteImage(room.images[imageIndex], 'rooms');
  room.images.splice(imageIndex, 1);
  await room.save();
  return res.json({ success: true, data: room });
}));

module.exports = router;
