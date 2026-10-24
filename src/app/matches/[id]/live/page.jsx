import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const LiveScoreViewerPage = dynamic(
  () => import('../../../../views/LiveScoreViewerPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted, #94a3b8)', fontFamily: 'system-ui, sans-serif' }}>
        Loading Match Live Arena…
      </div>
    )
  }
);

export const metadata = {
  title: 'Match Live Score & Video Stream | TurfSpot',
  description: 'View real-time live score updates, point-by-point tracking, and live video stream.',
  robots: {
    index: true,
    follow: true,
  }
};

export default async function MatchLiveScoreRoute({ params }) {
  const resolvedParams = params ? await params : {};
  const id = resolvedParams?.id;

  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Match Scoreboard…</div>}>
      <LiveScoreViewerPage matchId={id} />
    </Suspense>
  );
}
