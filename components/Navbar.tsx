'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calculator } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'en';
  const basePath = `/${locale}`;

  const menuItems = [
    { href: `${basePath}`, label: 'Home' },
    { href: `${basePath}/calculator`, label: 'Calculator' },
    { href: `${basePath}/blog`, label: 'Blog' },
    { href: `${basePath}/imprint`, label: 'Imprint' },
  ];

  const isActive = (href: string) => {
    const currentPath = pathname || '';
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={basePath} className="flex items-center gap-2 text-white font-bold text-xl hover:text-blue-400 transition-colors">
            <Calculator className="w-6 h-6" />
            <span>MyStudyCosts</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors relative group py-2 ${
                    active
                      ? 'text-blue-400'
                      : 'text-white/80 hover:text-blue-400'
                  }`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-400 transition-all duration-300 ${
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden text-white/80 hover:text-white transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-4">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`transition-colors px-2 py-2 rounded-md ${
                      active
                        ? 'text-blue-400 bg-white/5'
                        : 'text-white/80 hover:text-blue-400 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
