import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import SEO from '../components/SEO';
import ImageCarousel from '../components/ImageCarousel';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RoomDetail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/rooms/${encodeURIComponent(id)}`)
      .then(response => { if (active) setRoom(response.data.data); })
      .catch(() => { if (active) setError('Room not found.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !room) return <div className="container-page py-16 text-center"><p className="text-red-600 mb-4">{error || 'Room not found.'}</p><Link to="/rooms" className="text-gold underline">Back to rooms</Link></div>;

  return (
    <div className="container-page py-10">
      <SEO title={room.name} description={room.description} image={room.images?.[0]} />
      <h1 className="text-4xl mb-6">{room.name}</h1>
      <ImageCarousel images={room.images} folder="rooms" alt={room.name} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2">
          <p className="text-gray-700 leading-7 mb-6">{room.description}</p>
          <h2 className="text-2xl mb-3">Amenities</h2>
          <ul className="list-disc pl-6 space-y-1">{room.amenities?.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ul>
        </div>
        <aside className="bg-white p-6 rounded-xl shadow-sm h-fit">
          <p className="text-3xl text-gold font-serif">₹{Number(room.pricePerNight).toLocaleString('en-IN')} <span className="text-sm text-gray-500">/ night</span></p>
          <p className="mt-3">{room.isAvailable ? '✓ Available' : '✕ Currently unavailable'}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Link to={`/book?room=${room._id}`} className="bg-gold text-charcoal text-center py-3 rounded-lg font-semibold">Book This Room</Link>
            <a href="tel:08985705777" className="bg-charcoal text-white text-center py-3 rounded-lg">Call Lodge</a>
          </div>
        </aside>
      </div>
    </div>
  );
}
