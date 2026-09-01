const router = require('express').Router();
const mongoose = require('mongoose');
const BookingRequest = require('../models/BookingRequest');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { catchAsync } = require('../middleware/errorHandler');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { nanoid } = require('nanoid');

const roomLocks = new Map();

async function withRoomLock(roomId, task) {
  const previous = roomLocks.get(roomId) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = previous.catch(() => {}).then(() => current);
  roomLocks.set(roomId, queued);
  try {
    await previous;
    return await task();
  } finally {
    release();
    if (roomLocks.get(roomId) === queued) roomLocks.delete(roomId);
  }
}

async function generateReference() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const ref = `AG-${nanoid(10).toUpperCase()}`;
    if (!(await BookingRequest.exists({ bookingReference: ref }))) return ref;
  }
  throw new Error('Unable to generate a unique booking reference.');
}

function startOfTodayUtc() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function getConfirmedRoomCount(roomId, checkIn, checkOut, excludeId = null) {
  const query = {
    preferredRoom: roomId,
    status: 'Confirmed',
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };
  if (excludeId) query._id = { $ne: excludeId };
  const bookings = await BookingRequest.find(query).select('rooms').lean();
  return bookings.reduce((sum, booking) => sum + booking.rooms, 0);
}

const publicValidation = [
  body('guestName').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Guest name must be 1-100 characters.'),
  body('phone').trim().isMobilePhone('en-IN').withMessage('Invalid Indian phone number.'),
  body('checkIn').isISO8601({ strict: true }).withMessage('Invalid check-in date.').toDate(),
  body('checkOut').isISO8601({ strict: true }).withMessage('Invalid check-out date.').toDate(),
  body('guests').isInt({ min: 1, max: 10 }).withMessage('Guests must be between 1 and 10.'),
  body('rooms').isInt({ min: 1, max: 5 }).withMessage('Rooms must be between 1 and 5.'),
  body('preferredRoom').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid preferred room.'),
  body('specialRequest').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }).escape().withMessage('Special request is too long.')
];

router.post('/', bookingLimiter, publicValidation, catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

  const checkIn = req.body.checkIn;
  const checkOut = req.body.checkOut;
  if (checkIn < startOfTodayUtc()) return res.status(400).json({ success: false, message: 'Check-in cannot be in the past.' });
  if (checkOut <= checkIn) return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });

  const diffDays = (checkOut - checkIn) / 86400000;
  if (diffDays > 30) return res.status(400).json({ success: false, message: 'Booking period cannot exceed 30 days.' });

  const requestedRooms = Number(req.body.rooms);
  const preferredRoom = req.body.preferredRoom || null;

  const saveBooking = async () => {
    let roomDoc = null;
    if (preferredRoom) {
      roomDoc = await Room.findById(preferredRoom);
      if (!roomDoc) return res.status(400).json({ success: false, message: 'Selected room does not exist.' });
      if (!roomDoc.isAvailable) return res.status(409).json({ success: false, message: 'Selected room is currently unavailable.' });

      const totalConfirmed = await getConfirmedRoomCount(preferredRoom, checkIn, checkOut);
      const available = roomDoc.totalUnits - totalConfirmed;
      if (requestedRooms > available) {
        return res.status(409).json({ success: false, message: `Not enough rooms available. Only ${Math.max(0, available)} left for these dates.` });
      }
    }

    const booking = await BookingRequest.create({
      bookingReference: await generateReference(),
      guestName: req.body.guestName,
      phone: req.body.phone,
      checkIn,
      checkOut,
      guests: Number(req.body.guests),
      rooms: requestedRooms,
      preferredRoom,
      specialRequest: req.body.specialRequest || undefined,
      status: 'New'
    });

    await booking.populate('preferredRoom', 'name');
    return res.status(201).json({ success: true, data: booking });
  };

  return preferredRoom ? withRoomLock(preferredRoom, saveBooking) : saveBooking();
}));

router.get('/', auth, catchAsync(async (req, res) => {
  const bookings = await BookingRequest.find()
    .populate('preferredRoom', 'name')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: bookings });
}));

router.put('/:id', auth, catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
  }

  const status = String(req.body.status || '');
  if (!['New', 'Contacted', 'Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }

  const existing = await BookingRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'Booking not found.' });

  const confirmBooking = async () => {
    const booking = await BookingRequest.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (status === 'Confirmed' && booking.preferredRoom) {
      const room = await Room.findById(booking.preferredRoom);
      if (!room) return res.status(400).json({ success: false, message: 'Selected room no longer exists.' });
      if (!room.isAvailable) return res.status(409).json({ success: false, message: 'Room is currently marked unavailable.' });

      const totalConfirmed = await getConfirmedRoomCount(room._id, booking.checkIn, booking.checkOut, booking._id);
      const available = room.totalUnits - totalConfirmed;
      if (booking.rooms > available) {
        return res.status(409).json({ success: false, message: `Cannot confirm: only ${Math.max(0, available)} rooms remain for these dates.` });
      }
    }

    booking.status = status;
    await booking.save();
    await booking.populate('preferredRoom', 'name');
    return res.json({ success: true, data: booking });
  };

  return existing.preferredRoom && status === 'Confirmed'
    ? withRoomLock(existing.preferredRoom.toString(), confirmBooking)
    : confirmBooking();
}));

module.exports = router;
