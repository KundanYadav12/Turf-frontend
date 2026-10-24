import React from 'react';
import ScorerClientWrapper from './ScorerClientWrapper';

export const metadata = {
  title: 'Official Match Scorer Console | TurfSpot',
  description: 'Official multi-sport match scoring console for Cricket, Football, Badminton, and Pickleball tournaments.',
  robots: {
    index: false,
    follow: false,
  }
};

export default async function ScorerPageRoute({ params }) {
  const resolvedParams = params ? await params : {};
  return <ScorerClientWrapper matchId={resolvedParams?.id} />;
}
