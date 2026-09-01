import { useEffect, useState } from 'react';
import api from '../api/client';
import SEO from '../components/SEO';
import { getImageUrl } from '../components/ImageHelper';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/gallery')
      .then(response => setImages(response.data.data || []))
      .catch(() => setError('Unable to load the gallery right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  return (
    <div className="container-page py-10">
      <SEO title="Gallery" />
      <h1 className="text-4xl text-center mb-10">Gallery</h1>
      {error ? <p className="text-center text-red-600">{error}</p> : images.length ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {images.map(image => (
            <figure key={image._id} className="break-inside-avoid bg-white rounded-xl shadow-sm overflow-hidden">
              <img src={getImageUrl(image.image, 'gallery')} alt={image.title || 'Athidhi Grand property'} className="w-full" loading="lazy" />
              {image.title && <figcaption className="p-3 text-sm text-gray-600">{image.title}</figcaption>}
            </figure>
          ))}
        </div>
      ) : <p className="text-center text-gray-600">No gallery images have been added yet.</p>}
    </div>
  );
}
