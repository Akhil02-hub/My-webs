export default function Toast({ toast, onClose }) {
  if (!toast?.message) return null;
  const bg = toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`${bg} fixed right-4 top-20 z-50 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4 max-w-sm`} role="status">
      <span className="break-words">{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Close notification">✕</button>
    </div>
  );
}
