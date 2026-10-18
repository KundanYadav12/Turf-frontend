import React, { Suspense } from 'react';
import TournamentsPageClient from './TournamentsPageClient';
import {
  buildMetadata,
  buildBreadcrumbSchema,
  SEO_KEYWORDS
} from '../../lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

export const metadata = buildMetadata({
  title: 'Sports Tournaments, Leagues & Live Signage Hub',
  description: 'Join local box cricket leagues, corporate football tournaments, badminton championships, and pickleball open fixtures. Live scoring, point tables, and team registrations.',
  pathname: '/tournaments',
  keywords: [
    ...SEO_KEYWORDS.tournaments,
    'sports tournaments',
    'cricket league registration',
    'football cup',
    'live tournament scoring'
  ]
});

async function getInitialTournaments() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tournaments?limit=12`, { next: { revalidate: 30 } });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return {
        items: data.data,
        pagination: data.pagination || { hasMore: false, nextCursor: null }
      };
    }
  } catch (err) {
    console.error('Server fetching tournaments feed failed:', err);
  }
  return { items: [], pagination: {} };
}

export default async function TournamentsPage() {
  const { items, pagination } = await getInitialTournaments();

  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tournaments', url: '/tournaments' }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading tournaments hub…</div>}>
        <TournamentsPageClient
          initialTournaments={items}
          initialPagination={pagination}
        />
      </Suspense>
    </>
  );
}

