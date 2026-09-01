import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import SEO from '../components/SEO';
import { getImageUrl } from '../components/ImageHelper';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/rooms'), api.get('/site')])
      .then(([roomsRes, siteRes]) => {
        if (!active) return;
        setRooms(roomsRes.data.data || []);
        setSite(siteRes.data.data || null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingSpinner />;

  const heroImage = getImageUrl(site?.heroImage, 'hero');
  const amenities = site?.amenities || [];
  const phone = site?.phone || '08985705777';

  return (
    <>
      <SEO />
      <section className="relative min-h-[78vh] flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-4xl text-center text-white px-4 py-24">
          <p className="text-gold font-semibold tracking-widest uppercase mb-3">Welcome to</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-5">{site?.lodgeName || 'Athidhi Grand'}</h1>
          <p className="text-xl md:text-2xl font-light mb-8">{site?.tagline || 'Comfortable stay in the heart of Kodad'}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/book" className="bg-gold hover:bg-gold-light text-charcoal px-8 py-3 rounded-lg text-lg font-semibold">Book Your Stay</Link>
            <a href={`tel:${phone}`} className="bg-charcoal/90 hover:bg-charcoal text-white px-8 py-3 rounded-lg text-lg font-semibold">Call Now</a>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="text-4xl text-center mb-10">Our Rooms</h2>
        {rooms.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rooms.slice(0, 4).map(room => <RoomCard key={room._id} room={room} />)}
          </div>
        ) : <p className="text-center text-gray-600">Room information will be available soon.</p>}
        <div className="text-center mt-8"><Link to="/rooms" className="text-gold font-semibold underline">View All Rooms →</Link></div>
      </section>

      <section className="bg-white py-16">
        <div className="container-page max-w-4xl text-center">
          <h2 className="text-4xl mb-8">Amenities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-lg">
            {amenities.map((item, index) => <span key={`${item}-${index}`}>✓ {item}</span>)}
          </div>
        </div>
      </section>

      <section className="bg-charcoal text-white py-16 text-center px-4">
        <h2 className="text-4xl mb-4">Your comfortable stay awaits</h2>
        <p className="text-lg mb-7">Call us to check availability and confirm your booking.</p>
        <a href={`tel:${phone}`} className="inline-block bg-gold hover:bg-gold-light text-charcoal px-8 py-4 rounded-lg text-xl md:text-2xl font-bold">📞 {phone}</a>
      </section>
    </>
  );
}
