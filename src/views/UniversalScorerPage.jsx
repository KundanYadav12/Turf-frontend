'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from '../lib/routerCompat';
import axios from 'axios';
import CricketScorerPageClient from './CricketScorerPage';
import FootballScorerPage from './FootballScorerPage';
import BadmintonScorerPage from './BadmintonScorerPage';
import PickleballScorerPage from './PickleballScorerPage';

export default function UniversalScorerPage({ matchId: propsMatchId } = {}) {
  const routeParams = useParams();
  const matchIdFromUrl = typeof window !== 'undefined' ? window.location.pathname.match(/\/matches\/([^/]+)/)?.[1] : null;
  const id = propsMatchId || routeParams?.id || matchIdFromUrl;

  const [sportSlug, setSportSlug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchMatch = async () => {
      try {
        const res = await axios.get(`/api/matches/${id}`);
        if (res.data.success && isMounted) {
          const slug = res.data.data?.sport?.slug || 'cricket';
          setSportSlug(slug);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Failed to load match.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMatch();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        Loading Official Scorer Console…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: '#ef4444' }}>
        <h3>{error}</h3>
      </div>
    );
  }

  if (sportSlug === 'football') {
    return <FootballScorerPage matchId={id} />;
  }

  if (sportSlug === 'badminton') {
    return <BadmintonScorerPage matchId={id} />;
  }

  if (sportSlug === 'pickleball') {
    return <PickleballScorerPage matchId={id} />;
  }

  // Default to Cricket (or points-based scorer if racket)
  if (['tennis', 'table-tennis', 'volleyball'].includes(sportSlug)) {
    return <BadmintonScorerPage matchId={id} />;
  }

  return <CricketScorerPageClient matchId={id} />;
}
