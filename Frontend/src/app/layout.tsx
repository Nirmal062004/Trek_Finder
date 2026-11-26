
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { WishlistProvider } from '../context/WishlistContext';
import ClientNavbarWrapper from '../components/ClientNavbarWrapper';
import RequireAuth from '../components/RequireAuth';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Trek Finder',
    description: 'Discover and explore hiking trails across India',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" data-scroll-behavior="smooth">
            <head>
            </head>
            <body className={inter.className}>
                <AuthProvider>
                    <WishlistProvider>
                        <div id="__next" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06100d', color: '#e8f0eb' }}>
                            <ClientNavbarWrapper />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <RequireAuth>{children}</RequireAuth>
                            </div>
                        </div>
                    </WishlistProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
