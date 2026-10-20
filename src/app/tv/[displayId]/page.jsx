'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const TVDisplayPage = dynamic(
  () => import('../../../views/TVDisplayPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading TV Arena Display…
      </div>
    )
  }
);

export default function TVDisplayRoute() {
  const params = useParams();
  const displayId = params?.displayId || 'tv_arena_main_01';

  return <TVDisplayPage displayId={displayId} />;
}

