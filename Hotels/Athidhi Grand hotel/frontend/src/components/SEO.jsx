import { Helmet } from 'react-helmet-async';
import { useSiteInfo } from '../hooks/useSiteInfo';
import { absoluteUrl, getImageUrl } from './ImageHelper';

export default function SEO({ title, description, image, url }) {
  const { site } = useSiteInfo();
  const siteTitle = site?.lodgeName || 'Athidhi Grand';
  const metaTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const metaDescription = description || site?.tagline || 'Comfortable stay in Kodad.';
  const imageUrl = absoluteUrl(image ? getImageUrl(image, 'rooms') : getImageUrl(site?.heroImage, 'hero'));
  const canonicalUrl = url || window.location.href;

  return (
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
