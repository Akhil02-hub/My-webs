import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const timer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast({ message: '', type: 'info' }), 5000);
  }, []);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message: '', type: 'info' });
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, showToast, hideToast };
}
