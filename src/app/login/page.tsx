'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

function GoogleIcon() {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.582-3.333-11.227-7.962l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.902,35.688,44,30.41,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
    );
  }
  

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  async function handleGoogleSignIn() {
    if (!auth) return;

    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email && user.email.endsWith('@elietahari.com')) {
        toast({
          title: 'Success!',
          description: 'You have been successfully signed in.',
        });
        router.push('/');
      } else {
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Only users with an @elietahari.com email address can log in.',
        });
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: error.message || 'An error occurred during sign-in. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isAuthLoading || user) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
            Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
       <div className="absolute top-8 flex items-center gap-2">
          <Logo />
          <span className="font-headline text-lg font-semibold">
            Elie Tahari
          </span>
       </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>
                Sign in with your Google account to continue.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={handleGoogleSignIn} className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                    <GoogleIcon />
                    <span>Sign in with Google</span>
                </>
              )}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
