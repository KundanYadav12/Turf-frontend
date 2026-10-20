'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const SignageDisplayPage = dynamic(
  () => import('../../../../views/SignageDisplayPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading Tournament Signage…
      </div>
    )
  }
);

export default function SignageClientWrapper({ tournamentId }) {
  return <SignageDisplayPage tournamentId={tournamentId} />;
}
