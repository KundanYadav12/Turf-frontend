import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const LiveScoreViewerPage = dynamic(
  () => import('../../../../views/LiveScoreViewerPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted, #94a3b8)', fontFamily: 'system-ui, sans-serif' }}>
        Loading Live Arena…
      </div>
    )
  }
);

export const metadata = {
  title: 'Live Score & Broadcast Stream | TurfSpot',
  description: 'Real-time live scoring, visual court tracking, and live video broadcast for tournament matches.',
  robots: {
    index: true,
    follow: true,
  }
};

export default async function TournamentLiveScoreRoute({ params }) {
  const resolvedParams = params ? await params : {};
  const id = resolvedParams?.id;

  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Live Scoreboard…</div>}>
      <LiveScoreViewerPage tournamentId={id} />
    </Suspense>
  );
}
