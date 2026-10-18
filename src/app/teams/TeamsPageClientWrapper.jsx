'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const TeamsPage = dynamic(() => import('../../views/TeamsPage'), {
  ssr: false,
  loading: () => (
    <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
      Loading sports teams &amp; squad rosters…
    </div>
  )
});

export default function TeamsPageClientWrapper() {
  return <TeamsPage />;
}
