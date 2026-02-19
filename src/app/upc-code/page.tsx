'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function UpcCodePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.14))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="font-headline text-3xl font-semibold tracking-tight">
          UPC Code Generator
        </h1>
        <p className="text-muted-foreground">
          Generate and manage UPC codes for products.
        </p>
      </div>
      <div className="flex-1 rounded-lg border overflow-hidden">
        <iframe
          src="https://elie-tahari.vercel.app/"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
