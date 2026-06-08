'use client';

import Link from 'next/link';
import LightDarkToggle from '@/components/LightDarkToggle';

export default function Header() {
  return (
    <header className="flex items-center justify-between bg-surface border-b border-border px-4 py-3 md:px-6">
      <Link href="/" className="text-xl font-bold text-accent">HL</Link>
      <LightDarkToggle />
    </header>
  );
}
