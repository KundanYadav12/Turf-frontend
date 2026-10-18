import React from 'react';
import { notFound } from 'next/navigation';
import TeamDetailPage from '../../../views/TeamDetailPage';
import {
  buildMetadata,
  buildSportsTeamSchema,
  buildBreadcrumbSchema,
  SEO_KEYWORDS
} from '../../../lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

async function getTeamData(id) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/teams/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch team ${id}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const team = await getTeamData(params.id);
  if (!team) {
    return buildMetadata({
      title: 'Team Not Found',
      description: 'The requested sports team roster could not be found.',
      pathname: `/teams/${params.id}`,
      noIndex: true
    });
  }

  const sportName = team.sport?.name || 'Sports';
  return buildMetadata({
    title: `${team.name} | Squad Roster, Fixtures & Team Stats`,
    description: `${team.name} official sports club roster, player statistics, recent tournament results, and upcoming match fixtures for ${sportName} competitions.`,
    pathname: `/teams/${params.id}`,
    image: team.logoUrl,
    type: 'website',
    keywords: [
      team.name,
      `${team.name} squad`,
      `${sportName} team`,
      'team statistics',
      'player roster',
      'tournament team'
    ]
  });
}

export default async function TeamDetailRoute({ params }) {
  const team = await getTeamData(params.id);

  if (!team) {
    notFound();
  }

  const jsonLdTeam = buildSportsTeamSchema(team);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Teams', url: '/teams' },
    { name: team.name, url: `/teams/${params.id}` }
  ]);

  return (
    <>
      {jsonLdTeam && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdTeam) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <TeamDetailPage teamId={params.id} />
    </>
  );
}

