'use client';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  LayoutDashboard,
  Package,
  Barcode,
  TrendingUp,
  AreaChart,
  ChevronDown,
  ClipboardList,
  Factory,
  Warehouse,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const topLevelItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upc-code', label: 'UPC code', icon: Barcode },
  { href: '/sale-report', label: 'Sale Report', icon: TrendingUp },
  { href: '/adesiem-dx', label: 'Adesiem DX', icon: AreaChart },
];

const inventorySubItems = [
    { href: '/inventory', label: 'Overview', icon: ClipboardList },
    { href: '/inventory/factory', label: 'Factory POs', icon: Factory },
    { href: '/inventory/wms', label: 'WMS', icon: Warehouse },
    { href: '/inventory/shopify', label: 'Shopify', icon: ShoppingCart },
]

export function MainNav() {
  const pathname = usePathname();
  const isInventoryActive = pathname.startsWith('/inventory');
  const [isInventoryOpen, setIsInventoryOpen] = useState(isInventoryActive);

  return (
    <SidebarMenu>
      {topLevelItems.map(({ href, label, icon: Icon }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            asChild
            isActive={
              href === '/' ? pathname === href : pathname.startsWith(href)
            }
          >
            <Link href={href}>
              <Icon />
              <span>{label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

        <SidebarMenuItem asChild>
            <Collapsible open={isInventoryOpen} onOpenChange={setIsInventoryOpen} className="w-full">
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        isActive={isInventoryActive && pathname === '/inventory'}
                        className="w-full justify-between"
                        variant="default"
                    >
                        <div className="flex items-center gap-2">
                            <Package />
                            <span>Inventory</span>
                        </div>
                        <ChevronDown className={cn("transition-transform h-4 w-4", isInventoryOpen && "rotate-180")} />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="py-1 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <ul className="grid gap-1 px-2">
                        {inventorySubItems.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                                <SidebarMenuButton asChild isActive={pathname === href} size="sm" variant="ghost">
                                    <Link href={href} >
                                        <Icon />
                                        <span>{label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </li>
                        ))}
                    </ul>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    </SidebarMenu>
  );
}
