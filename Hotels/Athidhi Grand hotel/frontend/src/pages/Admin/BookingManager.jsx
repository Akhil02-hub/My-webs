import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const statuses = ['New', 'Contacted', 'Confirmed', 'Cancelled'];
const badgeClass = status => status === 'New' ? 'bg-blue-600' : status === 'Contacted' ? 'bg-yellow-600' : status === 'Confirmed' ? 'bg-green-600' : 'bg-red-600';

export default function BookingManager() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const fetchBookings = async () => {
    try { const response = await api.get('/bookings'); setBookings(response.data.data || []); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to load bookings.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id, status) => {
    try { await api.put(`/bookings/${id}`, { status }); showToast('Status updated.', 'success'); await fetchBookings(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to update status.', 'error'); }
  };

  if (loading) return <LoadingSpinner />;
  return (
    <div className="container-page py-10">
      <Toast toast={toast} onClose={hideToast} />
      <h1 className="text-3xl mb-6">Booking Requests</h1>
      {bookings.length ? <div className="overflow-x-auto bg-white rounded-xl shadow-sm"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr>{['Ref','Name','Phone','Check-in','Check-out','Room','Rooms','Status','Action'].map(h => <th key={h} className="text-left border-b p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>
        {bookings.map(booking => <tr key={booking._id} className="align-top"><td className="border-b p-3 whitespace-nowrap">{booking.bookingReference}</td><td className="border-b p-3">{booking.guestName}</td><td className="border-b p-3"><a href={`tel:${booking.phone}`} className="text-gold hover:underline">{booking.phone}</a></td><td className="border-b p-3">{new Date(booking.checkIn).toLocaleDateString('en-IN')}</td><td className="border-b p-3">{new Date(booking.checkOut).toLocaleDateString('en-IN')}</td><td className="border-b p-3">{booking.preferredRoom?.name || 'Any'}</td><td className="border-b p-3">{booking.rooms}</td><td className="border-b p-3"><span className={`${badgeClass(booking.status)} text-white px-2 py-1 rounded-full`}>{booking.status}</span></td><td className="border-b p-3"><select value={booking.status} onChange={e => updateStatus(booking._id, e.target.value)} className="border p-2 rounded"><option value={statuses[0]}>New</option><option value={statuses[1]}>Contacted</option><option value={statuses[2]}>Confirmed</option><option value={statuses[3]}>Cancelled</option></select></td></tr>)}
      </tbody></table></div> : <p className="text-gray-600">No booking requests yet.</p>}
    </div>
  );
}
