const mongoose = require('mongoose');

const roomImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: null }
}, { _id: true });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  pricePerNight: { type: Number, required: true, min: 0, max: 1000000 },
  amenities: { type: [String], default: [] },
  images: { type: [roomImageSchema], default: [] },
  isAvailable: { type: Boolean, default: true },
  totalUnits: { type: Number, required: true, min: 1, max: 100, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
