/**
 * TurfSpot Centralized SEO & Structured Data Engine
 * Supports Next.js 14 App Router Metadata API, Canonical URLs, Open Graph,
 * Twitter Cards, Robots Directives, and Schema.org JSON-LD Generators.
 */

import { APP_URL, BACKEND_URL as CFG_BACKEND_URL, buildAbsoluteUrl } from './siteConfig';

export const SITE_URL = APP_URL;
export const SITE_NAME = 'TurfSpot';
export const BACKEND_URL = CFG_BACKEND_URL;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/**
 * High-value keyword strategy themes for organic sports & turf discovery.
 */
export const SEO_KEYWORDS = {
  general: [
    'turf booking online',
    'sports facility booking',
    'box cricket turf',
    'football ground booking',
    'badminton court booking',
    'pickleball court availability',
    'sports tournament management',
    'turf booking near me'
  ],
  turfBooking: [
    'cricket turf booking',
    'cricket turf near me',
    'football turf booking',
    'football ground booking',
    'sports ground booking',
    'turf booking online',
    'sports facility booking',
    'turf booking management software'
  ],
  cricket: [
    'cricket turf booking',
    'box cricket near me',
    'cricket tournament fixtures',
    'cricket live scoring app',
    'box cricket pitch rental',
    'floodlit cricket turf',
    'cricket tournament points table',
    'cricket player profile'
  ],
  football: [
    'football turf booking',
    'football ground booking',
    'futsal turf 5v5',
    'football tournament schedule',
    'FIFA standard football turf',
    'football match fixtures',
    'football live scores'
  ],
  badminton: [
    'badminton court booking',
    'synthetic badminton court',
    'indoor badminton court near me',
    'badminton tournament registration',
    'BWF standard badminton court'
  ],
  pickleball: [
    'pickleball court booking',
    'pickleball tournament',
    'pickleball court near me',
    'indoor pickleball league',
    'pickleball court availability'
  ],
  tournaments: [
    'sports tournament registration',
    'tournament points table',
    'live cricket scorer',
    'multi-sport league management',
    'digital signage live scoreboard'
  ],
  localCities: [
    'cricket turf in Mumbai',
    'football ground in Bengaluru',
    'badminton court in Pune',
    'pickleball court in Delhi NCR',
    'sports tournaments in Mumbai',
    'turf booking near Andheri'
  ]
};


/**
 * Construct canonical URL cleanly without trailing slash discrepancy or duplicate slashes.
 */
export function buildCanonicalUrl(path = '') {
  if (!path || path === '/') return SITE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Remove trailing slash if present (except root)
  const trimmed = cleanPath.length > 1 && cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;
  return `${SITE_URL}${trimmed}`;
}

/**
 * Generate Next.js 14 App Router Metadata object with robust fallbacks.
 */
export function buildMetadata({
  title,
  description,
  path = '',
  canonical,
  image = DEFAULT_OG_IMAGE,
  imageAlt,
  type = 'website',
  noIndex = false,
  keywords = [],
  publishedTime,
  modifiedTime
}) {
  const canonicalUrl = canonical || buildCanonicalUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const effectiveKeywords = Array.from(new Set([...keywords, ...SEO_KEYWORDS.general]));

  const robots = noIndex
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
        }
      }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        }
      };

  return {
    title: {
      absolute: fullTitle
    },
    description,
    keywords: effectiveKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      images: [
        {
          url: image.startsWith('http') ? image : `${SITE_URL}${image}`,
          width: 1200,
          height: 630,
          alt: imageAlt || title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image.startsWith('http') ? image : `${SITE_URL}${image}`],
    }
  };
}

/* ==========================================================================
   SCHEMA.ORG JSON-LD GENERATORS
   ========================================================================== */

/**
 * Organization Schema for the TurfSpot Platform
 */
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TurfSpot Sports Booking & Tournament Platform',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Premier sports booking and facility management platform for FIFA-standard football turfs, box cricket pitches, synthetic badminton courts, and multi-sport tournaments.',
    sameAs: []
  };
}

/**
 * WebSite Schema with SearchAction
 */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * BreadcrumbList Schema
 * items: Array of { name: string, url: string }
 */
export function buildBreadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item : `${SITE_URL}${item.url.startsWith('/') ? item.url : `/${item.url}`}`
    }))
  };
}

/**
 * SportsActivityLocation Schema for verified turf venues
 */
export function buildSportsActivityLocationSchema(venue) {
  if (!venue) return null;

  const url = `${SITE_URL}/venue/${venue.slug || venue.id}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: venue.name,
    description: venue.description || `${venue.name} sports facility in ${venue.city}`,
    image: venue.primaryImage || venue.images?.[0] || DEFAULT_OG_IMAGE,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address || '',
      addressLocality: venue.city || 'Mumbai',
      addressRegion: venue.state || 'Maharashtra',
      postalCode: venue.pincode || '',
      addressCountry: 'IN'
    }
  };

  if (venue.latitude && venue.longitude) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: parseFloat(venue.latitude),
      longitude: parseFloat(venue.longitude)
    };
  }

  if (venue.startingPrice || venue.starting_price) {
    schema.priceRange = `₹${venue.startingPrice || venue.starting_price}/hr`;
  }

  if (venue.rating && venue.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: parseFloat(venue.rating).toFixed(1),
      reviewCount: parseInt(venue.reviewCount, 10) || 1,
      bestRating: '5',
      worstRating: '1'
    };
  }

  return schema;
}

/**
 * SportsEvent Schema for Tournaments and Matches
 */
export function buildSportsEventSchema({
  name,
  description,
  url,
  startDate,
  endDate,
  status = 'EventScheduled',
  locationName = 'Sports Arena',
  locationCity = 'India',
  competitors = [],
  organizerName = 'TurfSpot Sports Network'
}) {
  const statusMap = {
    LIVE: 'https://schema.org/EventLive',
    COMPLETED: 'https://schema.org/EventPostponed',
    REGISTRATION_OPEN: 'https://schema.org/EventScheduled',
    ONGOING: 'https://schema.org/EventLive',
    EventScheduled: 'https://schema.org/EventScheduled',
    EventLive: 'https://schema.org/EventLive'
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    description: description || `Official sports tournament event for ${name}`,
    url: url.startsWith('http') ? url : `${SITE_URL}${url}`,
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || startDate || new Date().toISOString(),
    eventStatus: statusMap[status] || 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: locationName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: locationCity,
        addressCountry: 'IN'
      }
    },
    organizer: {
      '@type': 'Organization',
      name: organizerName,
      url: SITE_URL
    }
  };

  if (competitors.length > 0) {
    schema.competitor = competitors.map(c => ({
      '@type': 'SportsTeam',
      name: typeof c === 'string' ? c : c.name
    }));
  }

  return schema;
}

/**
 * SportsTeam Schema
 */
export function buildSportsTeamSchema(team) {
  if (!team) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: team.sport?.name || 'Cricket',
    description: team.description || `${team.name} sports roster and tournament club`,
    url: `${SITE_URL}/teams/${team.id}`,
    image: team.logoUrl || undefined,
    member: team.members?.map(m => ({
      '@type': 'Person',
      name: m.fullName || m.name,
      roleName: m.role || 'PLAYER'
    }))
  };
}

/**
 * Athlete/Player Profile Schema (guaranteeing ZERO private contact exposure)
 */
export function buildAthleteProfileSchema(player) {
  if (!player) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: player.fullName,
      description: `Verified athlete profile with career tournament statistics on TurfSpot.`,
      url: `${SITE_URL}/players/${player.id}`,
      image: player.profilePhoto || undefined,
      award: player.awardsWon?.map(a => `${a.award_name} (${a.tournament_name})`),
      memberOf: player.teams?.map(t => ({
        '@type': 'SportsTeam',
        name: t.name,
        sport: t.sport_name
      }))
    }
  };
}

/**
 * FAQPage Schema for sport & service landing pages
 */
export function buildFaqSchema(faqItems = []) {
  if (!faqItems || faqItems.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}
