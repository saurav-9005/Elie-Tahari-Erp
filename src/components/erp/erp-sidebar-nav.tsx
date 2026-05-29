'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AppRole } from '@/lib/database.types';
import {
  AreaChart,
  Barcode,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SIDEBAR_STORAGE_KEY = 'erp-sidebar-collapsed';

/** Top-level nav entries shown to `admin`; `super admin` and other roles see full `items`. */
const ADMIN_SIDEBAR_HREFS = new Set([
  '/erp/dashboard',
  '/erp/orders',
  '/erp/inventory',
  '/erp/customers',
  '/erp/product-onboarding',
  '/erp/adesiem-dx',
]);

const items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/erp/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/erp/orders', label: 'Orders', icon: ReceiptText },
  { href: '/erp/inventory', label: 'Inventory', icon: Package },
  { href: '/erp/customers', label: 'Customers', icon: Users },
  { href: '/erp/product-onboarding', label: 'Product Onboarding', icon: Barcode },
  { href: '/erp/reports', label: 'Reports', icon: TrendingUp },
  { href: '/erp/adesiem-dx', label: 'Adesiem DX', icon: AreaChart },
  { href: '/erp/settings/users', label: 'Users', icon: Settings },
  { href: '/erp/settings/logs', label: 'Sync logs', icon: ClipboardList },
  { href: '/erp/ceo', label: 'Control Tower', icon: Gauge },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ordersItems = [
  { href: '/erp/orders/dashboard', label: 'Dashboard' },
  { href: '/erp/orders/sync', label: 'Sync' },
];

const inventoryItems = [
  { href: '/erp/inventory/dashboard', label: 'Dashboard' },
  { href: '/erp/inventory/reconciliation', label: 'Inventory Reconciliation' },
  { href: '/erp/inventory/shopify', label: 'Stock Analytics' },
  { href: '/erp/inventory/factory-po', label: 'Factory POs' },
  { href: '/erp/inventory/wms', label: 'Warehouse' },
  { href: '/erp/inventory/store', label: 'Store' },
  { href: '/erp/inventory/donation', label: 'Donation' },
];

const productOnboardingItems = [{ href: '/erp/upc-code', label: 'UPC Code' }];

const reportsItems = [
  { href: '/erp/sale-report', label: 'Compare Price Report' },
  { href: '/erp/reports/inventory', label: 'Inventory Report' },
  { href: '/erp/reports/q1-2026', label: 'Q1 2026' },
];

const customerItems = [
  { href: '/erp/customers/ltv-channel', label: 'LTV by Channel' },
  { href: '/erp/customers/ltv-product', label: 'LTV by Product' },
  { href: '/erp/customers/segments', label: 'Segments' },
  { href: '/erp/customers/promo-impact', label: 'Promo Impact' },
];

function navItemClass(active: boolean, collapsed: boolean, disabled = false) {
  return cn(
    'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
    collapsed && 'justify-center px-0',
    active
      ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
      : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    disabled && 'pointer-events-none opacity-40'
  );
}

function CollapsedItem({ href, label, icon: Icon, disabled = false }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }) {
  const pathname = usePathname();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} className={navItemClass(isActive(pathname, href), true, disabled)}>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="sr-only">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ErpSidebarNav({
  userRole,
  mobileDrawer = false,
}: {
  userRole: AppRole;
  mobileDrawer?: boolean;
}) {
  const pathname = usePathname();
  const navItems = useMemo(
    () => (userRole === 'admin' ? items.filter((item) => ADMIN_SIDEBAR_HREFS.has(item.href)) : items),
    [userRole]
  );
  const ordersActive = pathname.startsWith('/erp/orders');
  const inventoryActive = pathname.startsWith('/erp/inventory');
  const customersActive = pathname.startsWith('/erp/customers');
  const productOnboardingActive = pathname.startsWith('/erp/upc-code');
  const reportsActive =
    pathname.startsWith('/erp/sale-report') ||
    pathname.startsWith('/erp/reports/inventory') ||
    pathname.startsWith('/erp/reports/q1-2026');

  const [collapsed, setCollapsed] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(ordersActive);
  const [inventoryOpen, setInventoryOpen] = useState(inventoryActive);
  const [customersOpen, setCustomersOpen] = useState(customersActive);
  const [productOnboardingOpen, setProductOnboardingOpen] = useState(productOnboardingActive);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === '1') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const onChange = () => {
      const tablet = media.matches;
      setIsTablet(tablet);
      if (tablet) setCollapsed(true);
    };
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const effectiveCollapsed = mobileDrawer ? false : isTablet ? true : collapsed;

  return (
    <TooltipProvider delayDuration={100}>
      <nav
        aria-label="Main"
        className={cn(
          'rounded-lg border border-border p-2 transition-[width] duration-[250ms] ease-in-out',
          effectiveCollapsed ? 'w-[60px]' : 'w-56'
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            'mb-2 h-8 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            mobileDrawer ? 'hidden' : 'hidden lg:flex'
          )}
          aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {effectiveCollapsed ? (
          <ul className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <li key={href} className={href === '/erp/inventory' ? undefined : 'hidden'}>
                <CollapsedItem href={href} label={label} icon={Icon} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              href === '/erp/orders' ? (
                <li key={href} className="hidden">
                  <Collapsible open={ordersOpen} onOpenChange={setOrdersOpen}>
                    <CollapsibleTrigger className={cn(navItemClass(ordersActive, false), 'w-full justify-between')}>
                      <span className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 shrink-0" />
                        Orders
                      </span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', ordersOpen ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5">
                      {ordersItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive(pathname, item.href)
                              ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
                              : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : href === '/erp/inventory' ? (
                <li key={href}>
                  <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                    <CollapsibleTrigger className={cn(navItemClass(inventoryActive, false), 'w-full justify-between')}>
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0" />
                        Inventory
                      </span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', inventoryOpen ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5">
                      {inventoryItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive(pathname, item.href)
                              ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
                              : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : href === '/erp/customers' ? (
                <li key={href} className="hidden">
                  <Collapsible open={customersOpen} onOpenChange={setCustomersOpen}>
                    <CollapsibleTrigger className={cn(navItemClass(customersActive, false, true), 'w-full justify-between')}>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0" />
                        Customers
                      </span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', customersOpen ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5">
                      {customerItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive(pathname, item.href)
                              ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
                              : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : href === '/erp/product-onboarding' ? (
                <li key={href} className="hidden">
                  <Collapsible open={productOnboardingOpen} onOpenChange={setProductOnboardingOpen}>
                    <CollapsibleTrigger className={cn(navItemClass(productOnboardingActive, false), 'w-full justify-between')}>
                      <span className="flex items-center gap-2">
                        <Barcode className="h-4 w-4 shrink-0" />
                        Product Onboarding
                      </span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', productOnboardingOpen ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5">
                      {productOnboardingItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive(pathname, item.href)
                              ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
                              : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : href === '/erp/reports' ? (
                <li key={href} className="hidden">
                  <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
                    <CollapsibleTrigger className={cn(navItemClass(reportsActive, false), 'w-full justify-between')}>
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 shrink-0" />
                        Reports
                      </span>
                      <ChevronDown className={cn('h-4 w-4 transition-transform', reportsOpen ? 'rotate-180' : '')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5">
                      {reportsItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive(pathname, item.href)
                              ? 'border-l-2 border-[#0071E3] bg-muted font-medium text-foreground dark:border-white'
                              : 'border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              ) : (
                <li key={href} className="hidden">
                  <Link href={href} className={navItemClass(isActive(pathname, href), false)}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              )
            ))}
          </ul>
        )}
      </nav>
    </TooltipProvider>
  );
}
