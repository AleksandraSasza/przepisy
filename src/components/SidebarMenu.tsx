'use client';

import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarMenuProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarMenu({ children, open, onOpenChange }: SidebarMenuProps) {
  return (
    <>
      {/* Hamburger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpenChange(!open)}
        className="fixed top-6 right-6 z-50"
        aria-label="Toggle menu"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 h-full overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
}

