import { Link, useLocation } from 'react-router-dom';
import { useSiteInfo } from '../hooks/useSiteInfo';
import SEO from '../components/SEO';

export default function BookingSuccess() {
  const { state } = useLocation();
  const booking = state?.booking;
  const { site } = useSiteInfo();

  if (!booking) return <div className="container-page py-16 text-center"><p className="mb-4">No booking data found.</p><Link to="/book" className="text-gold underline">Create a booking request</Link></div>;

  const phone = site?.phone || '08985705777';
  const formatDate = value => new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SEO title="Booking Request Received" />
      <div className="bg-white shadow-sm rounded-xl p-6 md:p-8 text-center">
        <h1 className="text-3xl text-green-700 mb-4">Booking Request Received!</h1>
        <p className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm">Reference: {booking.bookingReference}</p>
        <div className="bg-gray-50 p-6 rounded-xl text-left mt-6 space-y-2">
          <p><strong>Name:</strong> {booking.guestName}</p>
          <p><strong>Phone:</strong> {booking.phone}</p>
          <p><strong>Check-in:</strong> {formatDate(booking.checkIn)}</p>
          <p><strong>Check-out:</strong> {formatDate(booking.checkOut)}</p>
          <p><strong>Guests:</strong> {booking.guests}</p>
          <p><strong>Rooms:</strong> {booking.rooms}</p>
          <p><strong>Preferred Room:</strong> {booking.preferredRoom?.name || 'Any available room'}</p>
          {booking.specialRequest && <p><strong>Special Request:</strong> {booking.specialRequest}</p>}
        </div>
        <p className="mt-6 text-amber-700 font-semibold">Room availability will be confirmed by the lodge.</p>
        <a href={`tel:${phone}`} className="inline-block mt-4 bg-green-600 text-white px-7 py-3 rounded-lg font-bold hover:bg-green-700">📞 Call {phone}</a>
        <Link to="/" className="block mt-6 text-gold underline">Return to Home</Link>
      </div>
    </div>
  );
}
