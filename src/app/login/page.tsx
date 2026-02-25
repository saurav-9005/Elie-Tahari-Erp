'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

// A list of approved email addresses for login.
const allowedEmails = [
    'sauravk@elietahari.com',
    'saurav9005@gmail.com'
];

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // This effect handles the sign-in completion when the user clicks the link in their email.
  useEffect(() => {
    if (!auth || isAuthLoading) return;

    if (user) {
      router.push('/');
      return;
    }

    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailFromStorage = window.localStorage.getItem('emailForSignIn');
      if (!emailFromStorage) {
        toast({
          variant: 'destructive',
          title: 'Sign-in link error',
          description: 'The sign-in link is invalid or has been used. Please try again.',
        });
        return;
      }
      
      setIsSubmitting(true);
      signInWithEmailLink(auth, emailFromStorage, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          toast({
            title: 'Success!',
            description: 'You are now signed in.',
          });
          router.push('/');
        })
        .catch((error) => {
          console.error('Firebase sign-in error:', error);
          toast({
            variant: 'destructive',
            title: 'Sign-in Failed',
            description: 'The sign-in link may have expired or is invalid. Please try again.',
          });
          setIsSubmitting(false);
        });
    }
  }, [auth, user, isAuthLoading, router, toast]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    if (!email) {
        toast({ variant: 'destructive', title: 'Email address is required' });
        return;
    }

    if (!allowedEmails.includes(email.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Access Denied', description: 'This email address is not authorized for access.' });
        return;
    }

    setIsSubmitting(true);
    
    const actionCodeSettings = {
      url: `${window.location.origin}/login`, // URL of the page that will handle the sign-in
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
      toast({
        title: 'Check your email',
        description: `A sign-in link has been sent to ${email}.`,
      });
    } catch (error: any) {
      console.error('Firebase send link error:', error);
      toast({
        variant: 'destructive',
        title: 'Error sending link',
        description: error.message || 'Could not send sign-in link. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // While checking auth state or completing sign-in, show a loader.
  if (isAuthLoading || (auth && isSignInWithEmailLink(auth, window.location.href))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Verifying...
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <div className="absolute top-8">
        <Logo />
      </div>

      <Card className="w-full max-w-sm">
        {emailSent ? (
          <>
            <CardHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                    <MailCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              <CardTitle className="pt-4 text-xl">Check your inbox</CardTitle>
              <CardDescription>
                A sign-in link has been sent to your email address. Click the link to log in.
              </CardDescription>
            </CardHeader>
             <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => { setEmailSent(false); setEmail(''); }}>
                    Use a different email
                </Button>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={handleEmailSubmit}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>
                Enter your email address to receive a sign-in link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Send Sign-In Link'
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
