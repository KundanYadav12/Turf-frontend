'use client';
import React, { Suspense } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import OwnerDashboardPageClient from '../../../views/OwnerDashboardPage';

export default function OwnerDashboardRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Owner Dashboard…</div>}>
      <ProtectedRoute allowedRoles={['VENUE_OWNER', 'ADMIN']}>
        <OwnerDashboardPageClient />
      </ProtectedRoute>
    </Suspense>
  );
}
