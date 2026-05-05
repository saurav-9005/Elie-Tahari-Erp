'use client';

import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AppRole } from '@/lib/database.types';
import { Logo } from '@/components/logo';
import { ErpSidebarNav } from '@/components/erp/erp-sidebar-nav';
import { ErpSignOutButton } from '@/components/erp/erp-sign-out-button';
import { ErpThemeToggle } from '@/components/erp/erp-theme-toggle';

export function ErpProtectedShell({
  userRole,
  userEmail,
  children,
}: {
  userRole: AppRole;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6 lg:p-8">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b pb-3 md:grid-cols-[1fr_auto_1fr] md:gap-3 md:pb-4">
        <div className="justify-self-start md:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="hidden md:block" />
        <Logo className="mx-auto max-h-10 w-auto" />
        <div className="justify-self-end text-right">
          <p className="hidden text-xs text-muted-foreground md:block">
            Role <span className="font-medium text-foreground">{userRole}</span> · {userEmail}
          </p>
          <div className="mt-0 flex items-center justify-end gap-1 md:mt-1">
            <ErpThemeToggle />
            <ErpSignOutButton />
          </div>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          aria-hidden
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div
            className="absolute left-0 top-0 h-full w-[280px] border-r border-border bg-background p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close sidebar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ErpSidebarNav userRole={userRole} mobileDrawer />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-6 md:gap-8 lg:flex-row lg:gap-10">
        <aside className="hidden shrink-0 md:block">
          <ErpSidebarNav userRole={userRole} />
        </aside>
        <div className="min-w-0 flex-1 [&_.font-headline.text-2xl]:text-xl md:[&_.font-headline.text-2xl]:text-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
