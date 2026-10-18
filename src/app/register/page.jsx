import React, { Suspense } from 'react';
import RegisterPageClient from '../../views/RegisterPage';

export const metadata = {
  title: 'Join TurfSpot — Player or Venue Owner Registration | TurfSpot',
  description: 'Create your TurfSpot account to book sports turfs instantly or list your facility as a verified partner.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function RegisterRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading registration…</div>}>
      <RegisterPageClient />
    </Suspense>
  );
}
