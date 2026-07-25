// src/utils/useResponsive.js
import { useState, useEffect } from 'react';

// Puntos de quiebre pensados para iPad: 1180 ~ landscape y menor, 860 ~ portrait.
const TABLET = 1180;
const NARROW = 860;

export default function useResponsive() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { width, isTablet: width <= TABLET, isNarrow: width <= NARROW };
}
