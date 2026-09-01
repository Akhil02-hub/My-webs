const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 100 },
  image: {
    url: { type: String, required: true },
    publicId: { type: String, default: null }
  },
  category: {
    type: String,
    enum: ['property', 'food', 'pool', 'surroundings'],
    default: 'property'
  }
}, { timestamps: true });

gallerySchema.index({ createdAt: -1 });

module.exports = mongoose.model('GalleryImage', gallerySchema);
