import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import TournamentDetailClient from './TournamentDetailClient';
import {
  buildMetadata,
  buildSportsEventSchema,
  buildBreadcrumbSchema,
  BACKEND_URL,
  SITE_URL
} from '../../../lib/seo';

async function getTournamentData(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tournaments/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch tournament ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const tournament = await getTournamentData(params.id);
  if (!tournament) {
    return buildMetadata({
      title: 'Tournament Not Found',
      description: 'The requested sports tournament could not be found.',
      noIndex: true
    });
  }

  const title = `${tournament.name} | Fixtures, Teams & Live Scoreboard`;
  const description = `Live fixtures, team standings, match schedules, and player auction for ${tournament.name} at ${tournament.venue?.name || 'Sports Arena'}. Follow simultaneous real-time match scores.`;
  const canonicalPath = `/tournaments/${params.id}`;
  const image = tournament.bannerUrl || '/og-image.jpg';

  return buildMetadata({
    title,
    description,
    path: canonicalPath,
    image,
    imageAlt: tournament.name,
    keywords: [
      `${tournament.name.toLowerCase()}`,
      `tournament in ${tournament.city?.toLowerCase() || 'india'}`,
      'live cricket scoring',
      'tournament fixtures and standings'
    ]
  });
}

export default async function TournamentDetailPage({ params }) {
  const tournament = await getTournamentData(params.id);

  if (!tournament) {
    notFound();
  }

  const jsonLdEvent = buildSportsEventSchema({
    name: tournament.name,
    description: tournament.description || `Official tournament fixtures and live scoring for ${tournament.name}`,
    url: `/tournaments/${params.id}`,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    status: tournament.status,
    locationName: tournament.venue?.name || 'Sports Arena',
    locationCity: tournament.city || 'India',
    organizerName: 'TurfSpot Sports Network'
  });

  const jsonLdBreadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tournaments', url: '/tournaments' },
    { name: tournament.name, url: `/tournaments/${params.id}` }
  ]);

  return (
    <>
      {jsonLdEvent && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdEvent) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading tournament details…</div>}>
        <TournamentDetailClient
          tournament={tournament}
          tournamentId={params.id}
        />
      </Suspense>
    </>
  );
}
