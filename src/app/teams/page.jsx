import React from 'react';
import TeamsPageClientWrapper from './TeamsPageClientWrapper';
import {
  buildMetadata,
  buildBreadcrumbSchema
} from '../../lib/seo';

export const metadata = buildMetadata({
  title: 'Sports Teams Hub & Player Rosters',
  description: 'Discover local sports teams, create squads for upcoming tournaments, manage players, and join competitive cricket, football, badminton, and pickleball clubs.',
  pathname: '/teams',
  keywords: [
    'sports teams',
    'cricket club squad',
    'football team roster',
    'player tournament profiles',
    'amateur sports teams'
  ]
});

export default function TeamsRoute() {
  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Teams', url: '/teams' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <TeamsPageClientWrapper />
    </>
  );
}

