import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { getImageUrl } from '../../components/ImageHelper';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SiteManager() {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchSite = async () => {
    try { const response = await api.get('/site'); setSite(response.data.data); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to load site info.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSite(); }, []);

  const amenitiesString = useMemo(() => site?.amenities?.join(', ') || '', [site]);
  const setField = (name, value) => setSite(prev => ({ ...prev, [name]: value }));

  const save = async e => {
    e.preventDefault(); setSaving(true);
    try { const response = await api.put('/site', { ...site, amenities: site.amenities || [] }); setSite(response.data.data); showToast('Site information saved.', 'success'); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to save site information.', 'error'); }
    finally { setSaving(false); }
  };

  const uploadHero = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Maximum image size is 5 MB.', 'error'); return; }
    const fd = new FormData(); fd.append('image', file); setUploading(true);
    try { const response = await api.post('/site/hero', fd); setSite(response.data.data); showToast('Hero image updated.', 'success'); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to upload hero image.', 'error'); }
    finally { setUploading(false); }
  };

  const deleteHero = async () => {
    if (!window.confirm('Reset the hero image to the default?')) return;
    try { const response = await api.delete('/site/hero'); setSite(response.data.data); showToast('Hero image reset.', 'success'); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to reset hero image.', 'error'); }
  };

  if (loading) return <LoadingSpinner />;
  if (!site) return <div className="container-page py-10">No site data found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Toast toast={toast} onClose={hideToast} />
      <h1 className="text-3xl mb-6">Site Manager</h1>
      <form onSubmit={save} className="bg-white p-6 rounded-xl shadow-sm space-y-5">
        <div><label className="block font-medium mb-1">Lodge Name</label><input maxLength={100} value={site.lodgeName || ''} onChange={e => setField('lodgeName', e.target.value)} className="w-full border p-3 rounded-lg" /></div>
        <div><label className="block font-medium mb-1">Tagline</label><input maxLength={200} value={site.tagline || ''} onChange={e => setField('tagline', e.target.value)} className="w-full border p-3 rounded-lg" /></div>
        <div><label className="block font-medium mb-1">About Text</label><textarea maxLength={3000} rows="5" value={site.aboutText || ''} onChange={e => setField('aboutText', e.target.value)} className="w-full border p-3 rounded-lg" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block font-medium mb-1">Phone</label><input maxLength={20} value={site.phone || ''} onChange={e => setField('phone', e.target.value)} className="w-full border p-3 rounded-lg" /></div><div><label className="block font-medium mb-1">Email</label><input type="email" maxLength={254} value={site.email || ''} onChange={e => setField('email', e.target.value)} className="w-full border p-3 rounded-lg" /></div></div>
        <div><label className="block font-medium mb-1">Address</label><input maxLength={300} value={site.address || ''} onChange={e => setField('address', e.target.value)} className="w-full border p-3 rounded-lg" /></div>
        <div><label className="block font-medium mb-1">Google Maps Embed URL</label><input maxLength={2000} value={site.mapEmbedUrl || ''} onChange={e => setField('mapEmbedUrl', e.target.value)} placeholder="https://www.google.com/maps/embed?..." className="w-full border p-3 rounded-lg" /><p className="text-xs text-gray-500 mt-1">Use the iframe src URL from Google Maps.</p></div>
        <div><label className="block font-medium mb-1">Amenities</label><input value={amenitiesString} onChange={e => setField('amenities', e.target.value.split(',').map(v => v.trim()).filter(Boolean))} className="w-full border p-3 rounded-lg" placeholder="WiFi, AC Rooms, Power Backup" /></div>
        <div><label className="block font-medium mb-2">Hero Image</label><div className="flex flex-col md:flex-row gap-4 items-start md:items-center"><img src={getImageUrl(site.heroImage, 'hero')} alt="Current hero" className="w-40 h-24 object-cover rounded-lg" /><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadHero} className="border p-2 rounded-lg" /><button type="button" onClick={deleteHero} className="bg-red-600 text-white px-4 py-2 rounded-lg">Reset</button></div></div>
        <button disabled={saving} className="bg-gold text-charcoal px-6 py-3 rounded-lg font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </div>
  );
}
