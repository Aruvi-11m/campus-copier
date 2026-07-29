'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Printer, ShoppingBag, BookOpen, Tag, Settings, LogOut, User, BarChart3 } from 'lucide-react';

interface AdminNavbarProps {
  displayName?: string;
}

export default function AdminNavbar({ displayName }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Orders', href: '/admin/dashboard', icon: ShoppingBag },
    { label: 'Control & Accounting', href: '/admin/accounting', icon: BarChart3 },
    { label: 'Ready Prints', href: '/admin/ready-prints', icon: BookOpen },
    { label: 'Pricing', href: '/admin/pricing', icon: Tag },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand & Active Admin */}
        <div className="flex items-center space-x-3">
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base hidden sm:inline">
              CampusCopier Admin
            </span>
          </Link>
          {displayName && (
            <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
              <User className="w-3 h-3 text-indigo-400" />
              <span>{displayName}</span>
            </span>
          )}
        </div>

        {/* Navigation & Logout */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 transition flex items-center space-x-1.5"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
