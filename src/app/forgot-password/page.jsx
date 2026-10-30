import React, { Suspense } from 'react';
import LoginPageClient from '../../views/LoginPage';

export const metadata = {
  title: 'Forgot Password | TurfSpot',
  description: 'Reset your account password securely on TurfSpot.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function ForgotPasswordRoute() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading password reset portal…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
