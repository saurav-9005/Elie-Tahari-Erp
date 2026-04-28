'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AreaChart,
  Barcode,
  ChevronDown,
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
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
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

const inventoryItems = [
  { href: '/erp/inventory/dashboard', label: 'Dashboard' },
  { href: '/erp/inventory/factory-po', label: 'Factory POs' },
  { href: '/erp/inventory/wms', label: 'WMS' },
  { href: '/erp/inventory/shopify', label: 'Shopify' },
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

export function ErpSidebarNav() {
  const pathname = usePathname();
  const inventoryActive = pathname.startsWith('/erp/inventory');
  const customersActive = pathname.startsWith('/erp/customers');
  const productOnboardingActive = pathname.startsWith('/erp/upc-code');
  const reportsActive =
    pathname.startsWith('/erp/sale-report') ||
    pathname.startsWith('/erp/reports/inventory') ||
    pathname.startsWith('/erp/reports/q1-2026');
  const [inventoryOpen, setInventoryOpen] = useState(inventoryActive);
  const [customersOpen, setCustomersOpen] = useState(customersActive);
  const [productOnboardingOpen, setProductOnboardingOpen] = useState(productOnboardingActive);
  const [reportsOpen, setReportsOpen] = useState(reportsActive);

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon }) => (
          href === '/erp/inventory' ? (
            <li key={href}>
              <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    inventoryActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 shrink-0" />
                    Inventory
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', inventoryOpen ? 'rotate-180' : '')}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-0.5">
                  {inventoryItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive(pathname, item.href)
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          ) : href === '/erp/customers' ? (
            <li key={href}>
              <Collapsible open={customersOpen} onOpenChange={setCustomersOpen}>
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'pointer-events-none opacity-40',
                    customersActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" />
                    Customers
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', customersOpen ? 'rotate-180' : '')}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-0.5">
                  {customerItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive(pathname, item.href)
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          ) : href === '/erp/product-onboarding' ? (
            <li key={href}>
              <Collapsible open={productOnboardingOpen} onOpenChange={setProductOnboardingOpen}>
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    productOnboardingActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Barcode className="h-4 w-4 shrink-0" />
                    Product Onboarding
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', productOnboardingOpen ? 'rotate-180' : '')}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-0.5">
                  {productOnboardingItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'ml-6 flex rounded-md px-2 py-1.5 text-sm transition-colors',
                        isActive(pathname, item.href)
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          ) : href === '/erp/reports' ? (
            <li key={href}>
              <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
                <CollapsibleTrigger
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    reportsActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
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
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </li>
          ) : (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  href === '/erp/orders' ? 'pointer-events-none opacity-40' : '',
                  isActive(pathname, href)
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            </li>
          )
        ))}
      </ul>
    </nav>
  );
}
