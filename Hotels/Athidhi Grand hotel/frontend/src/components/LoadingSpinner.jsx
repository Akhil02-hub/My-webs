export default function LoadingSpinner() {
  return (
    <div className="min-h-[16rem] flex items-center justify-center" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gold" />
    </div>
  );
}
