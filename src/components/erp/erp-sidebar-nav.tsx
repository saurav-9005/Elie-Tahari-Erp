'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AreaChart,
  Barcode,
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
import { cn } from '@/lib/utils';

const items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { href: '/erp/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/erp/orders', label: 'Orders', icon: ReceiptText },
    { href: '/erp/inventory', label: 'Inventory', icon: Package },
    { href: '/erp/customers', label: 'Customers', icon: Users },
    { href: '/erp/upc-code', label: 'UPC Code', icon: Barcode },
    { href: '/erp/sale-report', label: 'Sale Report', icon: TrendingUp },
    { href: '/erp/adesiem-dx', label: 'Adesiem DX', icon: AreaChart },
    { href: '/erp/settings/users', label: 'Users', icon: Settings },
    { href: '/erp/settings/logs', label: 'Sync logs', icon: ClipboardList },
    { href: '/erp/reports/inventory', label: 'Inventory Report', icon: FileSpreadsheet },
    { href: '/erp/ceo', label: 'Control Tower', icon: Gauge },
  ];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ErpSidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive(pathname, href)
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
