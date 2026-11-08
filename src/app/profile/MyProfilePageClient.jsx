'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const MyProfilePage = dynamic(() => import('../../views/MyProfilePage'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading Profile...</p>
    </div>
  )
});

export default function MyProfilePageClient() {
  return <MyProfilePage />;
}

