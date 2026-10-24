'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';

const SignageDisplayPage = dynamic(
  () => import('../../../../views/SignageDisplayPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading Tournament Signage…
      </div>
    )
  }
);

export default function SignageClientWrapper({ tournamentId }) {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth || {});
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    let currentUser = user;
    if (!currentUser && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
      } catch (e) {
        // ignore
      }
    }

    const userRole = (currentUser?.role || '').toUpperCase();
    const isSuperAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      setAuthorized(false);
      router.replace(`/tournaments/${tournamentId}`);
    } else {
      setAuthorized(true);
    }
  }, [user, router, tournamentId]);

  if (authorized === null) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)', fontFamily: 'system-ui, sans-serif' }}>
        Verifying authorization…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#ef4444', fontFamily: 'system-ui, sans-serif' }}>
        Access Restricted: Superadmin permissions required. Redirecting…
      </div>
    );
  }

  return <SignageDisplayPage tournamentId={tournamentId} />;
}

