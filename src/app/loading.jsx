import React from 'react';

export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--accent-primary)',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading Sports Platform…</p>
    </div>
  );
}
