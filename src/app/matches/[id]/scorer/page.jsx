import React, { Suspense } from 'react';
import UniversalScorerPage from '../../../../views/UniversalScorerPage';

export const metadata = {
  title: 'Official Match Scorer Console | TurfSpot',
  description: 'Official multi-sport match scoring console for Cricket, Football, Badminton, and Pickleball tournaments.',
  robots: {
    index: false,
    follow: false,
  }
};

export default function ScorerPageRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Scorer Console…</div>}>
      <UniversalScorerPage />
    </Suspense>
  );
}
