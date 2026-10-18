import React, { Suspense } from 'react';
import LoginPageClient from '../../views/LoginPage';

export const metadata = {
  title: 'Login to Your Account | TurfSpot',
  description: 'Login to manage your sports bookings, turf venue listings, tournament entries, and team rosters.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function LoginRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading login portal…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
