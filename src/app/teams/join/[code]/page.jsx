import React from 'react';
import TeamJoinPage from '../../../../views/TeamJoinPage';
import { buildMetadata, buildSportsTeamSchema, buildBreadcrumbSchema } from '../../../../lib/seo';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5008';

async function getInviteData(code) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/teams/invite/${code}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.data) return data.data;
  } catch (err) {
    console.error(`Failed to fetch invite info for code ${code}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }) {
  const team = await getInviteData(params.code);
  if (!team) {
    return buildMetadata({
      title: 'Invalid Team Invite | TurfSpot',
      description: 'The team invite link is invalid, expired, or has been revoked.',
      pathname: `/teams/join/${params.code}`,
      noIndex: true
    });
  }

  const sportName = team.sport?.name || 'Sports';
  return buildMetadata({
    title: `Join ${team.name} | Team Squad Invitation`,
    description: `You have been invited to join ${team.name} for ${sportName} tournaments and leagues on TurfSpot. Accept the squad invitation now!`,
    pathname: `/teams/join/${params.code}`,
    image: team.logoUrl,
    type: 'website'
  });
}

export default async function TeamJoinRoute({ params }) {
  const team = await getInviteData(params.code);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Teams', url: '/teams' },
    { name: team ? `Join ${team.name}` : 'Join Squad', url: `/teams/join/${params.code}` }
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <TeamJoinPage code={params.code} />
    </>
  );
}
