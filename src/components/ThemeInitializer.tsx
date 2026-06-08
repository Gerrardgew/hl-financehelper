'use client';

import { useEffect } from 'react';

export default function ThemeInitializer() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem('hl-theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (!theme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {
      // ignore errors
    }
  }, []);

  return null;
}
