import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';

const cards = [
  ['/admin/rooms', 'Manage Rooms', 'Add, edit, delete rooms and manage room photos.'],
  ['/admin/gallery', 'Manage Gallery', 'Upload and delete gallery images.'],
  ['/admin/bookings', 'Booking Requests', 'Review requests and change their status.'],
  ['/admin/site', 'Site Manager', 'Edit lodge information, amenities, maps and the hero image.']
];

export default function AdminDashboard() {
  return (
    <div className="container-page py-10">
      <SEO title="Admin Dashboard" />
      <h1 className="text-3xl mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(([to, title, text]) => (
          <Link key={to} to={to} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">{title}</h2>
            <p className="text-gray-600">{text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
