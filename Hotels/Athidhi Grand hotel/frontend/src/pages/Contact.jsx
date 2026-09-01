import { useSiteInfo } from '../hooks/useSiteInfo';
import SEO from '../components/SEO';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Contact() {
  const { site, loading } = useSiteInfo();
  if (loading) return <LoadingSpinner />;

  const phone = site?.phone || '08985705777';
  const email = site?.email || 'info@athidhigrand.com';
  const address = site?.address || 'Town Center Plaza, Opp: Govt. Hospital, Kodad, Telangana 508206';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO title="Contact" />
      <h1 className="text-4xl mb-6">Contact Us</h1>
      <div className="bg-white shadow-sm p-6 rounded-xl space-y-3">
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Phone:</strong> <a href={`tel:${phone}`} className="text-gold hover:underline">{phone}</a></p>
        <p><strong>Email:</strong> <a href={`mailto:${email}`} className="text-gold hover:underline">{email}</a></p>
        {site?.mapEmbedUrl && (
          <div className="mt-5 overflow-hidden rounded-lg">
            <iframe src={site.mapEmbedUrl} title="Athidhi Grand location" width="100%" height="350" style={{ border: 0 }} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          </div>
        )}
      </div>
    </div>
  );
}
