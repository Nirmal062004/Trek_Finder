'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navigation';

export default function ClientNavbarWrapper() {
    const pathname = usePathname();
    const hideNavbarRoutes = ['/login', '/signup'];

    if (pathname && hideNavbarRoutes.includes(pathname)) {
        return null;
    }

    return <Navbar />;
}
