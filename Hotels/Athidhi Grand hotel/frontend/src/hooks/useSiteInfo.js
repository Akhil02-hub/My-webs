import { useEffect, useState } from 'react';
import api from '../api/client';

export function useSiteInfo() {
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/site')
      .then(response => { if (active) setSite(response.data.data); })
      .catch(() => { if (active) setSite(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { site, loading };
}
