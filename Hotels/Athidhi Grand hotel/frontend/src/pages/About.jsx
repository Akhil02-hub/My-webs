import { useSiteInfo } from '../hooks/useSiteInfo';
import SEO from '../components/SEO';
import LoadingSpinner from '../components/LoadingSpinner';

export default function About() {
  const { site, loading } = useSiteInfo();
  if (loading) return <LoadingSpinner />;

  const name = site?.lodgeName || 'Athidhi Grand';
  const about = site?.aboutText || 'Athidhi Grand offers budget-friendly accommodation in Kodad.';
  const address = site?.address || 'Kodad, Telangana';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <SEO title="About" />
      <h1 className="text-4xl mb-6">About {name}</h1>
      <p className="text-lg leading-8 mb-5">{about}</p>
      <p className="text-lg leading-8">We are located at {address} and aim to provide comfortable, practical accommodation for visitors to Kodad.</p>
    </div>
  );
}
