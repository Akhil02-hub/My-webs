import { useEffect, useState } from 'react';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import SEO from '../components/SEO';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/rooms')
      .then(response => setRooms(response.data.data || []))
      .catch(() => setError('Unable to load rooms right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  return (
    <div className="container-page py-10">
      <SEO title="Rooms" />
      <h1 className="text-4xl text-center mb-10">Our Rooms</h1>
      {error ? <p className="text-center text-red-600">{error}</p> : rooms.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{rooms.map(room => <RoomCard key={room._id} room={room} />)}</div>
      ) : <p className="text-center text-gray-600">No rooms are listed yet.</p>}
    </div>
  );
}
