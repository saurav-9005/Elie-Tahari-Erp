import type { Metadata } from 'next';
import './globals.css';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Toaster } from '@/components/ui/toaster';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Elie Tahari ERP',
  description: 'Luxury Women Clothing ERP System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <Button variant="ghost" className="h-auto justify-start p-2" asChild>
                <Link href="/">
                  <Logo />
                  <div className="flex flex-col">
                    <span className="font-headline text-lg font-semibold">
                      Elie Tahari
                    </span>
                  </div>
                </Link>
              </Button>
            </SidebarHeader>
            <SidebarContent>
              <MainNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <header className="flex h-14 items-center justify-end gap-4 border-b bg-background/95 px-4 backdrop-blur-sm lg:px-6">
              <UserNav />
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
