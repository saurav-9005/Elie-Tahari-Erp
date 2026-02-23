'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@/firebase';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(false);

  // Handle the sign-in link completion
  useEffect(() => {
    if (!auth) return;

    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsProcessingLink(true);
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            toast({
                title: 'Success!',
                description: 'You have been successfully signed in.',
            });
            router.push('/');
          })
          .catch((error) => {
            console.error('signInWithEmailLink error:', error);
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: "The sign-in link may have expired or been used already. Please try again.",
            });
            setIsProcessingLink(false);
          });
      } else {
        setIsProcessingLink(false);
        toast({
          variant: 'destructive',
          title: 'Login Canceled',
          description: 'Email confirmation was not provided.',
        });
      }
    }
  }, [auth, router, toast]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth) return;

    setIsSubmitting(true);
    const actionCodeSettings = {
      url: `${window.location.origin}/login`, // Redirect back to this page to complete sign-in
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, values.email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', values.email);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('sendSignInLinkToEmail error:', error);
      toast({
        variant: 'destructive',
        title: 'Error sending email',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isAuthLoading || isProcessingLink || user) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">
            {isProcessingLink ? 'Verifying sign-in...' : 'Loading...'}
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
          {isEmailSent ? (
            <>
              <MailCheck className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>
                We've sent a secure sign-in link to your email. This link acts as a one-time password. Click it to sign in.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">Passwordless Login</CardTitle>
              <CardDescription>
                Enter your email to get a secure, one-time sign-in link.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!isEmailSent && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Send Sign-in Link'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
