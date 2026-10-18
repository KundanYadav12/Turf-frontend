import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import VenueDetailClient from './VenueDetailClient';
import {
  buildMetadata,
  buildSportsActivityLocationSchema,
  buildBreadcrumbSchema,
  BACKEND_URL,
  SITE_URL
} from '../../../lib/seo';

async function getVenueData(idOrSlug) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/venues/${idOrSlug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch venue ${idOrSlug}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const venue = await getVenueData(params.idOrSlug);
  if (!venue) {
    return buildMetadata({
      title: 'Venue Not Found',
      description: 'The requested sports facility could not be found.',
      noIndex: true
    });
  }

  const title = `Book ${venue.name} in ${venue.city} | Slots, Pricing & Reviews`;
  const description = `Reserve sports slots at ${venue.name}, located at ${venue.address}, ${venue.city}. Verified amenities, FIFA-grade pitch & instant slot booking guarantee.`;
  const canonicalPath = `/venue/${venue.slug || venue.id}`;
  const image = venue.primaryImage || venue.images?.[0] || '/og-image.jpg';

  return buildMetadata({
    title,
    description,
    path: canonicalPath,
    image,
    imageAlt: `${venue.name} in ${venue.city}`,
    keywords: [
      `book ${venue.name.toLowerCase()}`,
      `turf in ${venue.city.toLowerCase()}`,
      `${venue.city.toLowerCase()} sports ground`,
      'verified turf booking'
    ]
  });
}

export default async function VenueDetailPage({ params }) {
  const venue = await getVenueData(params.idOrSlug);

  if (!venue) {
    notFound();
  }

  const jsonLdVenue = buildSportsActivityLocationSchema(venue);

  const jsonLdBreadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: venue.city || 'Venues', url: `/city/${encodeURIComponent((venue.city || '').toLowerCase())}` },
    { name: venue.name, url: `/venue/${venue.slug || venue.id}` }
  ]);

  return (
    <>
      {jsonLdVenue && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVenue) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading sports venue…</div>}>
        <VenueDetailClient venue={venue} />
      </Suspense>
    </>
  );
}
