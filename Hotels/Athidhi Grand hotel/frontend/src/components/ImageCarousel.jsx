import { useEffect, useState } from 'react';
import { getImageUrl } from './ImageHelper';

export default function ImageCarousel({ images = [], folder, alt = 'Image' }) {
  const [current, setCurrent] = useState(0);
  const safeImages = images.length ? images : [null];

  useEffect(() => {
    setCurrent(0);
  }, [images]);

  if (!images.length) {
    return <div className="h-80 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">No images available</div>;
  }

  const next = () => setCurrent(index => (index + 1) % safeImages.length);
  const prev = () => setCurrent(index => (index - 1 + safeImages.length) % safeImages.length);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <img src={getImageUrl(safeImages[current], folder)} alt={alt} className="w-full h-80 md:h-96 object-cover" />
      {safeImages.length > 1 && (
        <>
          <button type="button" aria-label="Previous image" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">‹</button>
          <button type="button" aria-label="Next image" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full">›</button>
        </>
      )}
    </div>
  );
}
