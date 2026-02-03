
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from './Icons';
import { User } from '../_types/types';

interface SidebarProps {
  user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: Icons.Dashboard, href: '/shift-app', adminOnly: false },
    { id: 'tickets', label: 'Alterações', icon: Icons.Ticket, href: '/shift-app/tickets', adminOnly: false },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/shift-app' && pathname === '/shift-app') return true;
    if (href !== '/shift-app' && pathname.startsWith(href)) return true;
    return false;
  };

  // --- DESKTOP SIDEBAR ---
  const DesktopSidebar = () => (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground h-screen fixed left-0 top-0 z-50 transition-all duration-300">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary p-2 rounded-lg text-sidebar-primary-foreground shadow-sm">
            <Icons.Settings className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ShiftApp</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;

          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
            >
              <Icon size={20} className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-primary"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-3 mb-2 px-2">
          <img src={user?.avatar || "https://ui-avatars.com/api/?name=U&background=random"} alt="Avatar" className="w-9 h-9 rounded-full border border-sidebar-border" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Usuário'}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.jobTitle || 'Colaborador'}</p>
          </div>
          {user?.role === 'ADMIN' && (
            <span title="Administrador" className="bg-sidebar-primary/10 p-1.5 rounded-md">
              <Icons.Admin className="text-sidebar-primary" size={16} />
            </span>
          )}
        </div>
      </div>
    </aside>
  );

  // --- MOBILE BOTTOM NAV ---
  const MobileBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-safe z-50 flex justify-around items-center h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        if (item.adminOnly && user?.role !== 'ADMIN') return null;
        const Icon = item.icon;
        const isActive = isActiveLink(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-transform ${isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
      {/* Spacer for desktop to push content */}
      <div className="hidden md:block w-64 shrink-0 transition-all duration-300"></div>
    </>
  );
};
