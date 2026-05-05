'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import logoDark from './logo.png';
import logoLight from './logo_black.png';

export function Logo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const src = mounted && resolvedTheme === 'light' ? logoLight : logoDark;

  return (
    <Image
      src={src}
      alt="Elie Tahari"
      width={200}
      height={50}
      className={cn('h-auto', className)}
      priority
    />
  );
}
