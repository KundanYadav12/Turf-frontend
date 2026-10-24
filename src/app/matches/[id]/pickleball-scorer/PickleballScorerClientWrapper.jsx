'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const PickleballScorerPage = dynamic(
  () => import('../../../../views/PickleballScorerPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading Pickleball Scorer Console…
      </div>
    )
  }
);

export default function PickleballScorerClientWrapper({ matchId }) {
  return <PickleballScorerPage matchId={matchId} />;
}
