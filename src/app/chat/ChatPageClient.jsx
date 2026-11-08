'use client';
import React, { Suspense } from 'react';
import ChatPage from '../../views/ChatPage';

export default function ChatPageClient() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading Chat...</div>}>
      <ChatPage />
    </Suspense>
  );
}

