import { SITE_URL, BACKEND_URL } from '../lib/seo';

export default async function sitemap() {
  const now = new Date();

  // Core static & service landing pages
  const staticRoutes = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/tournaments`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/teams`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
  ];

  // High-value Sport Landing Pages
  const sportRoutes = [
    {
      url: `${SITE_URL}/sports/cricket`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sports/football`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sports/badminton`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/sports/pickleball`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/sports/turf-booking`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
  ];

  // Local SEO City Hubs
  const cityRoutes = [
    {
      url: `${SITE_URL}/city/mumbai`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/city/bengaluru`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/city/pune`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/city/delhi`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
  ];

  // Dynamic Venues
  let venueRoutes = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/venues`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        venueRoutes = data.data.map((venue) => ({
          url: `${SITE_URL}/venue/${venue.slug || venue.id}`,
          lastModified: venue.updatedAt ? new Date(venue.updatedAt) : now,
          changeFrequency: 'daily',
          priority: 0.85,
        }));
      }
    }
  } catch (err) {
    console.warn('Sitemap venue generation fallback:', err.message);
  }

  // Dynamic Tournaments
  let tournamentRoutes = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/tournaments?limit=100`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        tournamentRoutes = data.data.map((tournament) => ({
          url: `${SITE_URL}/tournaments/${tournament.id}`,
          lastModified: tournament.updatedAt ? new Date(tournament.updatedAt) : now,
          changeFrequency: 'hourly',
          priority: 0.8,
        }));
      }
    }
  } catch (err) {
    console.warn('Sitemap tournament generation fallback:', err.message);
  }

  // Dynamic Teams
  let teamRoutes = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/teams`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        teamRoutes = data.data.map((team) => ({
          url: `${SITE_URL}/teams/${team.id}`,
          lastModified: team.updatedAt ? new Date(team.updatedAt) : now,
          changeFrequency: 'daily',
          priority: 0.75,
        }));
      }
    }
  } catch (err) {
    console.warn('Sitemap team generation fallback:', err.message);
  }

  // Dynamic Players
  let playerRoutes = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/players`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        playerRoutes = data.data.map((player) => ({
          url: `${SITE_URL}/players/${player.id}`,
          lastModified: player.updated_at ? new Date(player.updated_at) : now,
          changeFrequency: 'weekly',
          priority: 0.7,
        }));
      }
    }
  } catch (err) {
    console.warn('Sitemap player generation fallback:', err.message);
  }

  return [
    ...staticRoutes,
    ...sportRoutes,
    ...cityRoutes,
    ...venueRoutes,
    ...tournamentRoutes,
    ...teamRoutes,
    ...playerRoutes,
  ];
}
