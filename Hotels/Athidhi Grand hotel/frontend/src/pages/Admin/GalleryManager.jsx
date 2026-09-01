import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { getImageUrl } from '../../components/ImageHelper';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function GalleryManager() {
  const [images, setImages] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('property');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchImages = async () => {
    try { const response = await api.get('/gallery'); setImages(response.data.data || []); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to load gallery.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Maximum image size is 5 MB.', 'error'); return; }
    const fd = new FormData(); fd.append('image', file); fd.append('title', title); fd.append('category', category);
    setUploading(true);
    try { await api.post('/gallery', fd); showToast('Image uploaded.', 'success'); setTitle(''); setCategory('property'); if (fileRef.current) fileRef.current.value = ''; await fetchImages(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to upload image.', 'error'); }
    finally { setUploading(false); }
  };

  const deleteImage = async id => {
    if (!window.confirm('Delete this gallery image?')) return;
    try { await api.delete(`/gallery/${id}`); showToast('Image deleted.', 'success'); await fetchImages(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to delete image.', 'error'); }
  };

  if (loading) return <LoadingSpinner />;
  return (
    <div className="container-page py-10">
      <Toast toast={toast} onClose={hideToast} />
      <h1 className="text-3xl mb-6">Manage Gallery</h1>
      <div className="bg-white p-5 rounded-xl shadow-sm mb-8">
        <h2 className="text-xl mb-4">Upload New Image</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="border p-3 rounded-lg" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="border p-3 rounded-lg"><option value="property">Property</option><option value="food">Food</option><option value="pool">Pool</option><option value="surroundings">Surroundings</option></select>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={handleUpload} className="border p-2 rounded-lg" />
        </div>
      </div>
      {images.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {images.map(image => <figure key={image._id} className="relative bg-white p-2 rounded-xl shadow-sm"><img src={getImageUrl(image.image, 'gallery')} alt={image.title || 'Gallery'} className="w-full h-44 object-cover rounded-lg" loading="lazy" /><figcaption className="text-sm mt-2 truncate">{image.title || 'Untitled'}</figcaption><button type="button" onClick={() => deleteImage(image._id)} aria-label="Delete image" className="absolute top-3 right-3 bg-red-600 text-white rounded-full w-7 h-7">×</button></figure>)}
      </div> : <p className="text-gray-600">No gallery images yet.</p>}
    </div>
  );
}
