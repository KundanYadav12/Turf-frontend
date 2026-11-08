import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import {
  buildMetadata,
  buildSportsEventSchema,
  buildBreadcrumbSchema
} from '../../../lib/seo';

export const dynamic = 'force-dynamic';

const MatchDetailPageClient = nextDynamic(
  () => import('../../../views/MatchDetailPage'),
  {
    ssr: false,
    loading: () => (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading live scorecard…
      </div>
    )
  }
);

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

async function getMatchData(id, tournamentId = null) {
  try {
    const url = tournamentId
      ? `${BACKEND_URL}/api/matches/${id}?tournamentId=${encodeURIComponent(tournamentId)}`
      : `${BACKEND_URL}/api/matches/${id}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch match ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params, searchParams }) {
  const tournamentId = searchParams?.tournamentId || searchParams?.tournament_id || null;
  const match = await getMatchData(params.id, tournamentId);
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

export default async function MatchDetailRoute({ params, searchParams }) {
  const tournamentId = searchParams?.tournamentId || searchParams?.tournament_id || null;
  const match = await getMatchData(params.id, tournamentId);

  // If a tournamentId was explicitly specified but the match does not belong to that tournament
  if (tournamentId && !match) {
    return (
      <div style={{ maxWidth: 640, margin: '6rem auto', textAlign: 'center', padding: '2.5rem 1.5rem', background: 'rgba(15, 23, 42, 0.65)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '2.75rem', marginBottom: '1rem' }}>🏟️</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', marginBottom: '0.75rem' }}>Match Not Found</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          This match does not belong to the specified tournament or the tournament ID is invalid.
        </p>
        <a
          href={`/tournaments/${tournamentId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.4rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}
        >
          ← Return to Tournament Fixtures
        </a>
      </div>
    );
  }

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

