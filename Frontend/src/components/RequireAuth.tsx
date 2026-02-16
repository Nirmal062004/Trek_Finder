"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

const ALLOWED_PUBLIC = ['/login', '/signup', '/'];

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (ALLOWED_PUBLIC.includes(pathname || '')) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, pathname]);

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  // If on a public route, allow children (login/signup). If authenticated, allow children.
  if (ALLOWED_PUBLIC.includes(pathname || '')) return <>{children}</>;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
