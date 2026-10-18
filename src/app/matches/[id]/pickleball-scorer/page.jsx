import React, { Suspense } from 'react';
import PickleballScorerPage from '../../../../views/PickleballScorerPage';

export const metadata = {
  title: 'Official Pickleball Scorer Console | TurfSpot',
  description: 'Live scoring console for Pickleball tournaments with real-time point tracking, lineup management, and automatic standings calculation.',
  robots: {
    index: false,
    follow: false,
  }
};

export default function PickleballScorerRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Pickleball Scorer Console…</div>}>
      <PickleballScorerPage />
    </Suspense>
  );
}
