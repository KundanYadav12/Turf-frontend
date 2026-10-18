import React from 'react';
import Link from 'next/link';
import { Compass, Home, Search, Trophy } from 'lucide-react';

export const metadata = {
  title: '404 - Page Not Found',
  description: 'The requested sports arena, tournament, or page could not be located on TurfSpot.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function NotFound() {
  return (
    <div className="container" style={{
      minHeight: '65vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'var(--accent-primary-glow)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Compass size={36} />
        </div>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--accent-primary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          404 Error
        </span>
        <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.2rem)', margin: '0.5rem 0 0.85rem 0', color: 'var(--text-heading)' }}>
          Arena or Match Not Found
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          The sports facility, tournament, or scorecard you are looking for may have concluded, been rescheduled, or moved.
        </p>
        <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Home size={16} /> Back to Home
          </Link>
          <Link href="/search" className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Search size={16} /> Explore Venues
          </Link>
          <Link href="/tournaments" className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Trophy size={16} /> Tournaments Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
