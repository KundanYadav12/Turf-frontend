import React, { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import { buildMetadata, BACKEND_URL, SITE_URL } from '../lib/seo';

export const metadata = buildMetadata({
  title: 'Book Sports Turfs, Box Cricket & Football Grounds Near You',
  description: 'Book verified cricket turfs, football grounds, and badminton courts instantly. Real-time slot availability, verified amenities, live match scorecards & sports tournament management.',
  path: '/',
  keywords: [
    'cricket turf booking',
    'football ground booking',
    'badminton court booking',
    'pickleball court availability',
    'turf booking near me',
    'box cricket tournament',
    'sports facility management'
  ]
});

async function getInitialHomeData() {
  let venues = [];
  let sports = [];
  try {
    const [venuesRes, sportsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/venues`, { next: { revalidate: 60 } }),
      fetch(`${BACKEND_URL}/api/sports`, { next: { revalidate: 300 } })
    ]);
    const venuesData = await venuesRes.json();
    const sportsData = await sportsRes.json();
    if (venuesData.success && Array.isArray(venuesData.data)) venues = venuesData.data;
    if (sportsData.success && Array.isArray(sportsData.data)) sports = sportsData.data;
  } catch (err) {
    console.error('Server fetching homepage data failed:', err);
  }
  return { venues, sports };
}

export default async function HomePage() {
  const { venues, sports } = await getInitialHomeData();

  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading sports arenas…</div>}>
      <HomePageClient
        initialVenues={venues}
        initialSports={sports}
      />
    </Suspense>
  );
}
