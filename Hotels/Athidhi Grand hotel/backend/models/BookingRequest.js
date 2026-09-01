const mongoose = require('mongoose');

const bookingRequestSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, unique: true, index: true },
  guestName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 15 },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1, max: 10 },
  rooms: { type: Number, required: true, min: 1, max: 5 },
  preferredRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
  specialRequest: { type: String, trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Confirmed', 'Cancelled'],
    default: 'New'
  }
}, { timestamps: true });

bookingRequestSchema.index({ checkIn: 1, checkOut: 1 });
bookingRequestSchema.index({ status: 1 });
bookingRequestSchema.index({ createdAt: -1 });
bookingRequestSchema.index({ preferredRoom: 1, status: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('BookingRequest', bookingRequestSchema);
