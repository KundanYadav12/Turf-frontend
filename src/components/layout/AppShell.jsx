'use client';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const pathname = usePathname() || '';

  // Suppress navbar and sidebar on fullscreen display/scorer/broadcast views
  const isDisplayRoute =
    pathname.startsWith('/display') ||
    pathname.startsWith('/tv') ||
    (pathname.includes('/auction') && pathname.endsWith('/live')) ||
    pathname.endsWith('/scorer') ||
    pathname.endsWith('/pickleball-scorer') ||
    pathname.endsWith('/overlay') ||
    pathname.endsWith('/watch');

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync collapsed state from localStorage after initial hydration to prevent SSR mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('turf_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      } else if (window.innerWidth <= 1024 && window.innerWidth > 768) {
        setIsCollapsed(true);
      }
    } catch (e) {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('turf_sidebar_collapsed', String(next));
        } catch (e) {}
      }
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  if (isDisplayRoute) {
    const isStrictTvDisplay =
      pathname.startsWith('/display') ||
      pathname.startsWith('/tv') ||
      pathname.endsWith('/overlay');

    if (isStrictTvDisplay) {
      return (
        <div
          style={{
            minHeight: 0,
            height: '100dvh',
            maxHeight: '100dvh',
            overflow: 'hidden',
            margin: 0,
            padding: 0
          }}
        >
          <main style={{ height: '100%', overflow: 'hidden' }}>
            {children}
          </main>
        </div>
      );
    }

    // Scorer consoles, auction live, and stream watch pages:
    // Suppress global sidebar/navbar but allow full vertical scrolling up and down
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
          margin: 0,
          padding: 0,
          background: 'var(--bg-page, #090d16)',
          color: 'var(--text-main, #f8fafc)'
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            width: '100%',
            overflowX: 'hidden'
          }}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-page, #090d16)',
        color: 'var(--text-main, #f8fafc)',
        overflowX: 'clip'
      }}
    >
      {/* ── Role-Based Responsive Sidebar ── */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* ── Main Layout Column ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          overflowX: 'clip'
        }}
      >
        <Navbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebarCollapse={handleToggleCollapse}
        />
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
            overflowX: 'clip'
          }}
        >
          {children}
        </main>
        {/* Suppress footer on viewport-filling chat interface */}
        {!pathname.startsWith('/chat') && <Footer />}
      </div>
    </div>
  );
}
