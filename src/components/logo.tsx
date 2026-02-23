'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Elie Tahari"
      width={200}
      height={18}
      className={cn('h-auto', className)}
      priority
    />
  );
}
