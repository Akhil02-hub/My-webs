import { Link } from 'react-router-dom';
import { getImageUrl } from './ImageHelper';

export default function RoomCard({ room }) {
  const image = room.images?.[0];
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
      <img src={getImageUrl(image, 'rooms')} alt={room.name} className="w-full h-56 object-cover" loading="lazy" />
      <div className="p-5">
        <h3 className="text-xl font-serif mb-2">{room.name}</h3>
        <p className="text-gold font-semibold text-lg">₹{Number(room.pricePerNight).toLocaleString('en-IN')} <span className="text-sm text-gray-500 font-normal">/ night</span></p>
        <p className="text-sm text-gray-600 mt-2">{room.isAvailable ? 'Available' : 'Currently unavailable'} · {room.totalUnits} unit{room.totalUnits === 1 ? '' : 's'}</p>
        <Link to={`/rooms/${room._id}`} className="block mt-4 text-center bg-charcoal text-white py-2 rounded-lg hover:bg-gray-800">View Room</Link>
      </div>
    </article>
  );
}
