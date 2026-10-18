'use client';
import React, { Suspense } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import AdminDashboardPageClient from '../../../views/AdminDashboardPage';

export default function AdminDashboardRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Admin Portal…</div>}>
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminDashboardPageClient />
      </ProtectedRoute>
    </Suspense>
  );
}
