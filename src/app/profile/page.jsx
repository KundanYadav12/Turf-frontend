import React from 'react';
import MyProfilePageClient from './MyProfilePageClient';
import { buildMetadata, buildBreadcrumbSchema } from '../../lib/seo';

export const metadata = buildMetadata({
  title: 'My Profile & Account Settings',
  description: 'View and manage your TurfSpot user profile, sports career statistics, team memberships, and security settings.',
  pathname: '/profile',
  noIndex: true
});

export default function ProfileRoute() {
  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'My Profile', url: '/profile' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <MyProfilePageClient />
    </>
  );
}

