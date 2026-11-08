import React from 'react';
import ChatPageClient from './ChatPageClient';
import { buildMetadata, buildBreadcrumbSchema } from '../../lib/seo';

export const metadata = buildMetadata({
  title: 'Sports Chat & Team Messaging',
  description: 'Real-time sports chat, team messaging, tournament group communications, and direct player messaging.',
  pathname: '/chat',
  keywords: ['sports chat', 'team messaging', 'tournament chat', 'player messaging']
});

export default function ChatRoute() {
  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Chat', url: '/chat' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <ChatPageClient />
    </>
  );
}

