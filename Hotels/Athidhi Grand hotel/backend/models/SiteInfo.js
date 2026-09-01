const mongoose = require('mongoose');

const siteInfoSchema = new mongoose.Schema({
  lodgeName: { type: String, trim: true, maxlength: 100, default: 'Athidhi Grand' },
  tagline: { type: String, trim: true, maxlength: 200, default: 'Comfortable Stay in Kodad' },
  aboutText: {
    type: String,
    trim: true,
    maxlength: 3000,
    default: 'Athidhi Grand offers budget-friendly accommodation with 24/7 hot water and WiFi. Located in the heart of Kodad, we are within easy reach of the bus stand.'
  },
  phone: { type: String, trim: true, maxlength: 20, default: '08985705777' },
  address: { type: String, trim: true, maxlength: 300, default: 'Town Center Plaza, Opp: Govt. Hospital, Kodad, Telangana 508206' },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: 'info@athidhigrand.com' },
  mapEmbedUrl: { type: String, trim: true, maxlength: 2000, default: '' },
  heroImage: {
    url: { type: String, default: '/hero.svg' },
    publicId: { type: String, default: '' }
  },
  amenities: {
    type: [String],
    default: ['24/7 Hot Water', 'WiFi', 'Power Backup', 'AC Rooms', 'Walkable from Bus Stand']
  },
  socialLinks: { type: Map, of: String, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('SiteInfo', siteInfoSchema);
