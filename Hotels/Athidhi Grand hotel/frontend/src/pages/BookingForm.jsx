import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import SEO from '../components/SEO';
import LoadingSpinner from '../components/LoadingSpinner';

function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function BookingForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ guestName: '', phone: '', checkIn: '', checkOut: '', guests: 1, rooms: 1, preferredRoom: '', specialRequest: '' });

  useEffect(() => {
    let active = true;
    api.get('/rooms')
      .then(response => { if (active) setRooms(response.data.data || []); })
      .finally(() => { if (active) setLoading(false); });
    const roomId = new URLSearchParams(location.search).get('room');
    if (roomId) setForm(prev => ({ ...prev, preferredRoom: roomId }));
    return () => { active = false; };
  }, [location.search]);

  const minDate = useMemo(() => todayIso(), []);
  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await api.post('/bookings', form);
      navigate('/booking-success', { state: { booking: response.data.data }, replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit the booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SEO title="Book Your Stay" />
      <div className="bg-white shadow-sm rounded-xl p-6 md:p-8">
        <h1 className="text-4xl text-center mb-6">Book Your Stay</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label className="block font-medium mb-1" htmlFor="guestName">Full Name *</label><input id="guestName" name="guestName" value={form.guestName} onChange={handleChange} required maxLength={100} className="w-full border p-3 rounded-lg" /></div>
          <div><label className="block font-medium mb-1" htmlFor="phone">Phone Number *</label><input id="phone" type="tel" name="phone" value={form.phone} onChange={handleChange} required inputMode="tel" placeholder="10-digit Indian mobile" className="w-full border p-3 rounded-lg" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block font-medium mb-1" htmlFor="checkIn">Check-in *</label><input id="checkIn" type="date" name="checkIn" min={minDate} value={form.checkIn} onChange={handleChange} required className="w-full border p-3 rounded-lg" /></div>
            <div><label className="block font-medium mb-1" htmlFor="checkOut">Check-out *</label><input id="checkOut" type="date" name="checkOut" min={form.checkIn || minDate} value={form.checkOut} onChange={handleChange} required className="w-full border p-3 rounded-lg" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block font-medium mb-1" htmlFor="guests">Guests</label><input id="guests" type="number" name="guests" min="1" max="10" value={form.guests} onChange={handleChange} className="w-full border p-3 rounded-lg" /></div>
            <div><label className="block font-medium mb-1" htmlFor="rooms">Rooms</label><input id="rooms" type="number" name="rooms" min="1" max="5" value={form.rooms} onChange={handleChange} className="w-full border p-3 rounded-lg" /></div>
          </div>
          <div><label className="block font-medium mb-1" htmlFor="preferredRoom">Preferred Room</label><select id="preferredRoom" name="preferredRoom" value={form.preferredRoom} onChange={handleChange} className="w-full border p-3 rounded-lg"><option value="">Any available room</option>{rooms.map(room => <option key={room._id} value={room._id}>{room.name} — ₹{room.pricePerNight}/night</option>)}</select></div>
          <div><label className="block font-medium mb-1" htmlFor="specialRequest">Special Requests</label><textarea id="specialRequest" name="specialRequest" maxLength={1000} rows="4" value={form.specialRequest} onChange={handleChange} className="w-full border p-3 rounded-lg" /></div>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg" role="alert">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full bg-gold hover:bg-gold-light text-charcoal py-3 rounded-lg font-semibold disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Booking Request'}</button>
          <p className="text-sm text-gray-500 text-center">This is a request. The lodge will contact you to confirm availability.</p>
        </form>
      </div>
    </div>
  );
}
