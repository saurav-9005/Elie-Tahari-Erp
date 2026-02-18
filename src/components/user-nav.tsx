'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';

type Role = 'Sales Manager' | 'Admin' | 'Factory Manager' | 'Warehouse Manager' | 'E-commerce Manager' | 'Finance';

const roleEmails: Record<Role, string> = {
    'Admin': 'admin@elietahari.com',
    'Factory Manager': 'factory.manager@elietahari.com',
    'Warehouse Manager': 'warehouse.manager@elietahari.com',
    'E-commerce Manager': 'ecomm.manager@elietahari.com',
    'Finance': 'finance@elietahari.com',
    'Sales Manager': 'manager@elietahari.com', // default
}

export function UserNav() {
  const [role, setRole] = useState<Role>('Sales Manager');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" alt="@shadcn" data-ai-hint="person face" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{role}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {roleEmails[role]}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
            <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as Role)}>
                {Object.keys(roleEmails).map(roleName => (
                    <DropdownMenuRadioItem key={roleName} value={roleName}>{roleName}</DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
