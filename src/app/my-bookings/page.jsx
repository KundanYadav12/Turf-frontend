'use client';
import React, { Suspense } from 'react';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import MyBookingsPageClient from '../../views/MyBookingsPage';

export default function MyBookingsRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading bookings…</div>}>
      <ProtectedRoute>
        <MyBookingsPageClient />
      </ProtectedRoute>
    </Suspense>
  );
}
