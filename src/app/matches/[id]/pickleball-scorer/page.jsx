import React from 'react';
import PickleballScorerClientWrapper from './PickleballScorerClientWrapper';

export const metadata = {
  title: 'Official Pickleball Scorer Console | TurfSpot',
  description: 'Live scoring console for Pickleball tournaments with real-time point tracking, lineup management, and automatic standings calculation.',
  robots: {
    index: false,
    follow: false,
  }
};

export default async function PickleballScorerRoute({ params }) {
  const resolvedParams = params ? await params : {};
  return <PickleballScorerClientWrapper matchId={resolvedParams?.id} />;
}
