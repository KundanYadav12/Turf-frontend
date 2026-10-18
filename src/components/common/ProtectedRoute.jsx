'use client';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if auth token exists in localStorage during initial load
    const token = typeof window !== 'undefined' ? localStorage.getItem('turf_token') : null;
    const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('turf_user') : null;
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;

    const currentUser = user || storedUser;
    const isAuthed = isAuthenticated || !!token;

    if (!isAuthed) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!currentUser || !allowedRoles.includes(currentUser.role)) {
        router.replace('/');
        return;
      }
    }

    setAuthorized(true);
  }, [user, isAuthenticated, allowedRoles, router]);

  if (!authorized) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Authenticating &amp; verifying permissions…
      </div>
    );
  }

  return <>{children}</>;
}
