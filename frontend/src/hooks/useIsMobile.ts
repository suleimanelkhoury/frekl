/**
 * useIsMobile — true below the `sm` breakpoint (640px).
 *
 * Exists for chart geometry that CSS cannot reach: Recharts renders
 * SVG with numeric props (axis widths, dot radii), so those adapt via
 * this hook instead of Tailwind classes. Reacts to viewport changes
 * (rotation, window resize) via matchMedia.
 */

import { useEffect, useState } from 'react';

const QUERY = '(max-width: 639px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
