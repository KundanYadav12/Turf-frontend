import React, { Suspense } from 'react';
import SearchPageClient from './SearchPageClient';
import { buildMetadata, buildBreadcrumbSchema, BACKEND_URL, SITE_URL } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const city = searchParams?.city || 'Mumbai';
  const sport = searchParams?.sport ? `${searchParams.sport.charAt(0).toUpperCase() + searchParams.sport.slice(1)} ` : '';

  const title = `Find & Book ${sport}Turfs & Courts in ${city}`;
  const description = `Compare prices, check real-time availability, and instantly book FIFA-grade football turfs, synthetic badminton courts & box cricket arenas in ${city}.`;
  const canonicalUrl = `${SITE_URL}/search?city=${encodeURIComponent(city)}${searchParams?.sport ? `&sport=${encodeURIComponent(searchParams.sport)}` : ''}`;

  return buildMetadata({
    title,
    description,
    canonical: canonicalUrl,
    keywords: [
      `${sport.toLowerCase()} turf in ${city.toLowerCase()}`,
      `sports ground in ${city.toLowerCase()}`,
      `turf booking ${city.toLowerCase()}`,
      'instant slot booking'
    ]
  });
}

async function getSearchVenues(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.city) query.set('city', params.city);
    if (params.sport) query.set('sport', params.sport);
    if (params.q) query.set('search', params.q);
    if (params.maxPrice) query.set('maxPrice', params.maxPrice);

    const res = await fetch(`${BACKEND_URL}/api/venues?${query.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) return data.data;
  } catch (err) {
    console.error('Server fetching search venues failed:', err);
  }
  return [];
}

export default async function SearchPage({ searchParams }) {
  const venues = await getSearchVenues(searchParams);
  const city = searchParams?.city || 'Mumbai';

  const jsonLdBreadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Search Arenas', url: '/search' },
    { name: city, url: `/search?city=${encodeURIComponent(city)}` }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Searching arenas…</div>}>
        <SearchPageClient
          initialVenues={venues}
          searchParamsServer={searchParams || {}}
        />
      </Suspense>
    </>
  );
}
