'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('App Route Error:', error);
  }, [error]);

  return (
    <div className="container" style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.15)',
          color: 'var(--accent-rose)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.65rem', color: 'var(--text-heading)' }}>
          Something went wrong
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          {error?.message || 'An unexpected error occurred while loading this page. Our team has been notified.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => reset()} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <RotateCcw size={16} /> Try Again
          </button>
          <Link href="/" className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Home size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
