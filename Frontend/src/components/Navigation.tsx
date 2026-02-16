"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/Navigation.module.css';
import { Lock, User as UserIcon, Settings as SettingsIcon, LogOut, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavigationProps {
  activeNav?: string | null;
  onNavChange?: (nav?: string | null) => void;
  locked?: boolean;
}

const Navigation: React.FC<NavigationProps> = (_props) => {
  const { user, isAdmin, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarSeed, setAvatarSeed] = useState('');

  const navItems = [
    { href: '/', label: 'HOME', id: 'home' },
    { href: '/finder', label: 'FINDER', id: 'finder' },
    { href: '/gallery', label: 'GALLERY', id: 'gallery' },
    { href: '/chat', label: 'CHAT ROOM', id: 'chat' },
  ];

  // Load avatar seed on mount and listen for updates
  useEffect(() => {
    if (user) {
      const updateAvatar = () => {
        const seed = localStorage.getItem('trek_finder_avatar_seed') || user.name || 'Anonymous';
        setAvatarSeed(seed);
      };

      updateAvatar(); // Initial load

      window.addEventListener('storage', updateAvatar); // Cross-tab sync
      window.addEventListener('avatar-updated', updateAvatar); // Same-tab sync

      return () => {
        window.removeEventListener('storage', updateAvatar);
        window.removeEventListener('avatar-updated', updateAvatar);
      };
    }
  }, [user]);

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
        <div className={styles['nav-menu']}>
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
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                    alt="Profile"
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
