"use client";

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from '@/styles/Navigation.module.css';
import { Lock, User as UserIcon, Settings as SettingsIcon, LogOut, Compass, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function subscribeToAvatarChanges(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener('avatar-updated', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('avatar-updated', onChange);
  };
}

const Navigation: React.FC = () => {
  const { user, isAdmin, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuState, setMobileMenuState] = useState<{ pathname: string | null; open: boolean }>({ pathname: null, open: false });
  const isMobileMenuOpen = mobileMenuState.open && mobileMenuState.pathname === pathname;
  const setIsMobileMenuOpen = (open: boolean) => setMobileMenuState({ pathname, open });
  const avatarOwner = user?.id || user?.email || user?.name || 'anon';
  const avatarKey = `trek_finder_avatar_seed_${avatarOwner}`;
  const getAvatarSeed = useCallback(() => localStorage.getItem(avatarKey) || user?.name || 'Anonymous', [avatarKey, user?.name]);
  const avatarSeed = useSyncExternalStore(subscribeToAvatarChanges, getAvatarSeed, () => user?.name || 'Anonymous');

  const navItems = [
    { href: '/', label: 'HOME', id: 'home' },
    { href: '/finder', label: 'FINDER', id: 'finder' },
    { href: '/gallery', label: 'GALLERY', id: 'gallery' },
    { href: '/chat', label: 'CHAT ROOM', id: 'chat' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={styles.navbar}>
      <div className={styles['nav-container']}>
        <Link href="/" className={styles['nav-logo']} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Compass size={24} color="#2bff88" style={{ marginRight: '8px' }} />
          <span className={styles['logo-text']}>Trek Finder</span>
        </Link>

        <button
          className={styles['mobile-menu-btn']}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <div className={`${styles['nav-menu']} ${isMobileMenuOpen ? styles['mobile-open'] : ''}`}>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${styles['nav-link']} ${isActive ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin">
              <button className={`${styles['nav-link']}`}>ADMIN</button>
            </Link>
          )}

          <div className={styles['profile-container']} ref={dropdownRef}>
            {isAuthenticated ? (
              <>
                <button
                  className={styles['profile-icon']}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  title={user?.name}
                  style={{ padding: 0, overflow: 'hidden', border: '2px solid rgba(43,255,136,0.3)' }}
                >
                  <Image
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                    alt="Profile"
                    width={40}
                    height={40}
                    unoptimized
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
                {dropdownOpen && (
                  <div className={styles['dropdown-menu']}>
                    {pathname !== '/profile' && (
                      <Link href="/profile" className={styles['dropdown-item']} onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <UserIcon size={16} /> Profile
                      </Link>
                    )}
                    <Link href="/settings" className={styles['dropdown-item']} onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                      <SettingsIcon size={16} /> Settings
                    </Link>
                    <button
                      className={styles['dropdown-item']}
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={`${styles['profile-icon']} ${styles['locked']}`}
                  title="Sign in"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Lock size={20} />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
