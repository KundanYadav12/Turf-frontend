import React from 'react';
import { notFound } from 'next/navigation';
import PlayerProfileView from '../../../views/PlayerProfileView';
import {
  buildMetadata,
  buildAthleteProfileSchema,
  buildBreadcrumbSchema,
  SEO_KEYWORDS
} from '../../../lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

async function getPlayerData(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/players/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch player ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const player = await getPlayerData(params.id);
  if (!player) {
    return buildMetadata({
      title: 'Player Profile Not Found',
      description: 'The requested sports player profile could not be found.',
      pathname: `/players/${params.id}`,
      noIndex: true
    });
  }

  const sportsList = player.sportsProfiles?.map(sp => sp.sportName).join(', ') || 'Multi-Sport Athlete';
  return buildMetadata({
    title: `${player.fullName} | Sports Career Stats & Accolades`,
    description: `Follow ${player.fullName}'s verified sports statistics, matches played, tournament honours, and team rosters across ${sportsList} on TurfSpot.`,
    pathname: `/players/${params.id}`,
    image: player.profilePhoto,
    type: 'profile',
    keywords: [
      player.fullName,
      `${player.fullName} stats`,
      'athlete profile',
      'player career stats',
      sportsList
    ]
  });
}

export default async function PlayerProfilePage({ params }) {
  const player = await getPlayerData(params.id);

  if (!player) {
    notFound();
  }

  const jsonLdAthlete = buildAthleteProfileSchema(player);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Athletes', url: '/teams' },
    { name: player.fullName, url: `/players/${params.id}` }
  ]);

  return (
    <>
      {jsonLdAthlete && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdAthlete) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <PlayerProfileView player={player} />
    </>
  );
}

