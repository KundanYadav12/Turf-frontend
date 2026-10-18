'use client';
import React, { Suspense } from 'react';
import LiveAuctionPage from '../../../../../views/LiveAuctionPage';

export default function TournamentLiveAuctionRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading live auction room…</div>}>
      <LiveAuctionPage />
    </Suspense>
  );
}
