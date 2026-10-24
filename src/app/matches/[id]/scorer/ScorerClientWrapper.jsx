'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const UniversalScorerPage = dynamic(
  () => import('../../../../views/UniversalScorerPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading Official Scorer Console…
      </div>
    )
  }
);

export default function ScorerClientWrapper({ matchId }) {
  return <UniversalScorerPage matchId={matchId} />;
}
