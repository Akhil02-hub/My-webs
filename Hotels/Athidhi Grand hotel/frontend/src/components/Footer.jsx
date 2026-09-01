import { useSiteInfo } from '../hooks/useSiteInfo';

export default function Footer() {
  const { site } = useSiteInfo();
  const name = site?.lodgeName || 'Athidhi Grand';
  const phone = site?.phone || '08985705777';
  const address = site?.address || 'Kodad, Telangana';

  return (
    <footer className="bg-charcoal text-white text-center py-6 mt-10">
      <p>&copy; {new Date().getFullYear()} {name}. All rights reserved.</p>
      <p className="text-sm mt-1">{address} · <a href={`tel:${phone}`} className="text-gold hover:underline">{phone}</a></p>
    </footer>
  );
}
