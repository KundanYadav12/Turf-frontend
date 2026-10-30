import React, { Suspense } from 'react';
import LoginPageClient from '../../views/LoginPage';

export const metadata = {
  title: 'Reset Password | TurfSpot',
  description: 'Enter your new password to reset your TurfSpot account credentials.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading password reset portal…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
