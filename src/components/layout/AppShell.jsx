'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';

export default function AppShell({ children }) {
  const pathname = usePathname() || '';

  const isDisplayRoute =
    pathname.startsWith('/display') ||
    pathname.startsWith('/tv') ||
    (pathname.includes('/auction') && pathname.endsWith('/live')) ||
    pathname.endsWith('/scorer');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isDisplayRoute && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      {!isDisplayRoute && <Footer />}
    </div>
  );
}
