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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: isDisplayRoute ? 0 : '100vh',
        height: isDisplayRoute ? '100dvh' : undefined,
        maxHeight: isDisplayRoute ? '100dvh' : undefined,
        overflow: isDisplayRoute ? 'hidden' : undefined,
        margin: 0,
        padding: 0
      }}
    >
      {!isDisplayRoute && <Navbar />}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          height: isDisplayRoute ? '100%' : undefined,
          overflow: isDisplayRoute ? 'hidden' : undefined
        }}
      >
        {children}
      </main>
      {!isDisplayRoute && <Footer />}
    </div>
  );
}
