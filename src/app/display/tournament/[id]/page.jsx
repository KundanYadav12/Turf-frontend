import React, { Suspense } from 'react';
import SignageDisplayPageClient from '../../../../views/SignageDisplayPage';

export const metadata = {
  title: 'Digital Signage Tournament Scoreboard | TurfSpot',
  description: 'Full-screen LED digital scoreboard signage display for sports tournaments.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function DisplayTournamentRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Tournament Signage…</div>}>
      <SignageDisplayPageClient />
    </Suspense>
  );
}
