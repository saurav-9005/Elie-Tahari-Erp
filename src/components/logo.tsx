'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import logo from './logo.png';

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="Elie Tahari"
      width={200}
      height={50}
      className={cn('h-auto', className)}
      priority
    />
  );
}
