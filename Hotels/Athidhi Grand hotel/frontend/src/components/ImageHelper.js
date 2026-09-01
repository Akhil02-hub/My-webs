export function getImageUrl(image, folder = '') {
  if (!image) return '/placeholder.svg';

  const raw = typeof image === 'string' ? image : image.url;
  if (!raw) return '/placeholder.svg';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;

  return folder ? `/uploads/${folder}/${raw}` : `/uploads/${raw}`;
}

export function absoluteUrl(url) {
  if (!url) return window.location.origin;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, window.location.origin).href;
}
