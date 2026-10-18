'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const TVDisplayPage = dynamic(() => import('../../../views/TVDisplayPage'), {
  ssr: false,
  loading: () => (
    <div style={{
      background: '#090d16',
      color: '#10b981',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      fontWeight: 800,
      fontFamily: 'Inter, sans-serif'
    }}>
      Connecting to Smart TV Arena Feed…
    </div>
  )
});

export default function TVDisplayRoute() {
  const params = useParams();
  const displayId = params?.displayId || 'tv_arena_main_01';

  return <TVDisplayPage displayId={displayId} />;
}

