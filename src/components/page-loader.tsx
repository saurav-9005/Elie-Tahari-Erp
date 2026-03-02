'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function PageLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // When the path changes, we trigger the loading indicator.
    // We use a key to re-mount the component and restart the CSS animation.
    setLoading(true);
    setKey(prev => prev + 1);

    // The new page content has likely already started rendering.
    // We'll hide the loader after a short delay to ensure the animation is visible.
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500); // The duration can be adjusted.

    return () => {
      clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  if (!loading) {
    return null;
  }

  return (
    <div key={key} className="page-loader">
      <div className="bar" />
    </div>
  );
}
