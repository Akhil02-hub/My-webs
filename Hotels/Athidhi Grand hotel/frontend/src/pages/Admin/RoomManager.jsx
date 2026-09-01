import { useEffect, useState } from 'react';
import api from '../../api/client';
import { getImageUrl } from '../../components/ImageHelper';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const emptyForm = { name: '', description: '', pricePerNight: '', amenities: '', isAvailable: true, totalUnits: 1 };

export default function RoomManager() {
  const [rooms, setRooms] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchRooms = async () => {
    try { const response = await api.get('/rooms'); setRooms(response.data.data || []); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to load rooms.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const reset = () => { setEditing(null); setForm({ ...emptyForm }); };
  const submit = async e => {
    e.preventDefault();
    const payload = { ...form, description: form.description.trim(), pricePerNight: Number(form.pricePerNight), totalUnits: Number(form.totalUnits), amenities: form.amenities.split(',').map(v => v.trim()).filter(Boolean) };
    try {
      if (editing) await api.put(`/rooms/${editing._id}`, payload); else await api.post('/rooms', payload);
      showToast(editing ? 'Room updated.' : 'Room created.', 'success');
      reset();
      await fetchRooms();
    } catch (error) { showToast(error.response?.data?.message || 'Failed to save room.', 'error'); }
  };

  const edit = room => setEditing(room) || setForm({ name: room.name, description: room.description || '', pricePerNight: room.pricePerNight, amenities: (room.amenities || []).join(', '), isAvailable: room.isAvailable, totalUnits: room.totalUnits });

  const deleteRoom = async id => {
    if (!window.confirm('Delete this room and all of its images?')) return;
    try { await api.delete(`/rooms/${id}`); showToast('Room deleted.', 'success'); await fetchRooms(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to delete room.', 'error'); }
  };

  const uploadImage = async (roomId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Maximum image size is 5 MB.', 'error'); return; }
    const fd = new FormData(); fd.append('image', file);
    setUploadingId(roomId);
    try { await api.post(`/rooms/${roomId}/images`, fd); showToast('Image uploaded.', 'success'); await fetchRooms(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to upload image.', 'error'); }
    finally { setUploadingId(null); }
  };

  const deleteImage = async (roomId, imageId) => {
    if (!window.confirm('Delete this image?')) return;
    try { await api.delete(`/rooms/${roomId}/images/${imageId}`); showToast('Image deleted.', 'success'); await fetchRooms(); }
    catch (error) { showToast(error.response?.data?.message || 'Failed to delete image.', 'error'); }
  };

  if (loading) return <LoadingSpinner />;
  return (
    <div className="container-page py-10">
      <Toast toast={toast} onClose={hideToast} />
      <h1 className="text-3xl mb-6">Manage Rooms</h1>
      <form onSubmit={submit} className="bg-white p-5 rounded-xl shadow-sm mb-8 space-y-4">
        <h2 className="text-xl">{editing ? 'Edit Room' : 'Add Room'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Room name" className="border p-3 rounded-lg" />
          <input required maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="border p-3 rounded-lg" />
          <input required type="number" min="0" max="1000000" value={form.pricePerNight} onChange={e => setForm({ ...form, pricePerNight: e.target.value })} placeholder="Price per night" className="border p-3 rounded-lg" />
          <input required type="number" min="1" max="100" value={form.totalUnits} onChange={e => setForm({ ...form, totalUnits: e.target.value })} placeholder="Total units" className="border p-3 rounded-lg" />
          <input value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} placeholder="Amenities, comma separated" className="border p-3 rounded-lg md:col-span-2" />
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })} /> Available for booking</label>
        <div className="flex gap-2"><button className="bg-gold text-charcoal px-5 py-2 rounded-lg font-semibold">{editing ? 'Update' : 'Create'}</button>{editing && <button type="button" onClick={reset} className="bg-gray-200 px-5 py-2 rounded-lg">Cancel</button>}</div>
      </form>

      {rooms.length ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map(room => <div key={room._id} className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="text-xl mb-1">{room.name}</h2>
          <p>₹{room.pricePerNight}/night · {room.totalUnits} unit{room.totalUnits === 1 ? '' : 's'}</p>
          <p className="text-sm text-gray-600 mt-1">{room.isAvailable ? 'Available' : 'Unavailable'}</p>
          <div className="grid grid-cols-4 gap-2 my-4">
            {(room.images || []).map(image => <div key={image._id} className="relative"><img src={getImageUrl(image, 'rooms')} alt={room.name} className="w-full h-16 object-cover rounded" loading="lazy" /><button type="button" title="Delete image" onClick={() => deleteImage(room._id, image._id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs">×</button></div>)}
          </div>
          <label className="block text-sm mb-2">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingId === room._id} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; uploadImage(room._id, file); }} className="block w-full mt-1" /></label>
          <div className="flex gap-2 mt-3"><button type="button" onClick={() => { setEditing(room); setForm({ name: room.name, description: room.description || '', pricePerNight: room.pricePerNight, amenities: (room.amenities || []).join(', '), isAvailable: room.isAvailable, totalUnits: room.totalUnits }); }} className="bg-blue-600 text-white px-3 py-2 rounded">Edit</button><button type="button" onClick={() => deleteRoom(room._id)} className="bg-red-600 text-white px-3 py-2 rounded">Delete</button></div>
        </div>)}
      </div> : <p className="text-gray-600">No rooms yet.</p>}
    </div>
  );
}
