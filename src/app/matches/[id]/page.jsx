import React, { Suspense } from 'react';
import MatchDetailPageClient from '../../../views/MatchDetailPage';
import {
  buildMetadata,
  buildSportsEventSchema,
  buildBreadcrumbSchema
} from '../../../lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

async function getMatchData(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/matches/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch match ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const match = await getMatchData(params.id);
  if (!match) {
    return buildMetadata({
      title: 'Match Scorecard & Live Commentary',
      description: 'Live match score, commentary, and ball-by-ball updates.',
      pathname: `/matches/${params.id}`
    });
  }

  const teamA = match.teamAName || 'Team A';
  const teamB = match.teamBName || 'Team B';
  const statusLabel = match.status === 'LIVE' ? '🔴 LIVE Scorecard & Commentary' : 'Match Scorecard & Results';

  return buildMetadata({
    title: `${teamA} vs ${teamB} | ${statusLabel}`,
    description: `Ball-by-ball commentary, scorecard, and player statistics for ${teamA} vs ${teamB}. Real-time tournament coverage on TurfSpot.`,
    pathname: `/matches/${params.id}`,
    type: 'website',
    keywords: [
      `${teamA} vs ${teamB}`,
      'live cricket score',
      'match commentary',
      'sports scorecard',
      'live tournament match'
    ]
  });
}

export default async function MatchDetailRoute({ params }) {
  const match = await getMatchData(params.id);

  const jsonLdMatch = match ? buildSportsEventSchema({
    name: `${match.teamAName || 'Team A'} vs ${match.teamBName || 'Team B'}`,
    description: `Match commentary and live scorecard for ${match.teamAName} vs ${match.teamBName}`,
    url: `/matches/${params.id}`,
    startDate: match.matchTime || new Date().toISOString(),
    status: match.status === 'LIVE' ? 'EventLive' : 'EventScheduled',
    competitors: [
      match.teamAName || 'Team A',
      match.teamBName || 'Team B'
    ]
  }) : null;

  const breadcrumbs = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Tournaments', url: '/tournaments' },
    { name: match ? `${match.teamAName || 'Team A'} vs ${match.teamBName || 'Team B'}` : 'Match', url: `/matches/${params.id}` }
  ]);

  return (
    <>
      {jsonLdMatch && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdMatch) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading live scorecard…</div>}>
        <MatchDetailPageClient matchId={params?.id} initialMatch={match} />
      </Suspense>
    </>
  );
}

