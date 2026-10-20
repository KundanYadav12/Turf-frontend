import React, { Suspense } from 'react';
import SignageClientWrapper from './SignageClientWrapper';

export const metadata = {
  title: 'Digital Signage Tournament Scoreboard | TurfSpot',
  description: 'Full-screen LED digital scoreboard signage display for sports tournaments.',
  robots: {
    index: false,
    follow: true,
  }
};

export default async function DisplayTournamentRoute({ params }) {
  const resolvedParams = params ? await params : {};
  const id = resolvedParams?.id;
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Tournament Signage…</div>}>
      <SignageClientWrapper tournamentId={id} />
    </Suspense>
  );
}
