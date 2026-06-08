'use client';

import { useEffect, useState } from 'react';

export default function LightDarkToggle() {
  // Determine initial theme (localStorage > system)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('hl-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync theme changes to document and storage
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('hl-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('hl-theme', 'light');
    }
  }, [dark]);

  return (
    <button
      aria-label="Toggle light/dark mode"
      onClick={() => setDark(!dark)}
      className="flex items-center gap-2 rounded-full bg-surface-2 border border-border px-3 py-1 text-sm text-text hover:bg-surface transition-colors"
    >
      {dark ? '🌙' : '☀️'}
    </button>
  );
}
