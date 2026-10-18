import React, { Suspense } from 'react';
import MatchDetailPageClient from '../../../../views/MatchDetailPage';

export const metadata = {
  title: 'Digital Signage Match Display | TurfSpot',
  description: 'Full-screen live match scoreboard signage view.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function DisplayMatchRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Match Display…</div>}>
      <MatchDetailPageClient />
    </Suspense>
  );
}
