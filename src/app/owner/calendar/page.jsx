'use client';
import React, { Suspense } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import OwnerCalendarPageClient from '../../../views/OwnerCalendarPage';

export default function OwnerCalendarRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Multi-Court Calendar…</div>}>
      <ProtectedRoute allowedRoles={['VENUE_OWNER', 'ADMIN']}>
        <OwnerCalendarPageClient />
      </ProtectedRoute>
    </Suspense>
  );
}
