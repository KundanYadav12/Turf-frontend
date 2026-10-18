import React, { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  buildMetadata,
  buildBreadcrumbSchema,
  buildFaqSchema,
  BACKEND_URL,
  SITE_URL,
  SEO_KEYWORDS
} from '../../../lib/seo';
import {
  MapPin,
  Star,
  CheckCircle,
  Trophy,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  Compass,
  Building2
} from 'lucide-react';

export const revalidate = 120;

const CITY_METADATA = {
  mumbai: {
    name: 'Mumbai',
    state: 'Maharashtra',
    tagline: 'Discover premier floodlit box cricket turfs, FIFA-standard 5v5/7v7 football grounds, and synthetic courts across Andheri, Bandra, Thane, and Navi Mumbai.',
    popularAreas: ['Andheri West', 'Bandra', 'Goregaon', 'Powai', 'Thane', 'Navi Mumbai', 'Borivali'],
    metaTitle: 'Sports Turfs & Box Cricket Grounds in Mumbai',
    metaDescription: 'Find and book the best box cricket turfs, 5v5 football grounds, and badminton courts in Mumbai. Instant slot booking with verified floodlit arenas.',
    faqs: [
      {
        question: 'What are the top locations for box cricket turfs in Mumbai?',
        answer: 'Popular sports hubs in Mumbai include Andheri West (Off Link Road), Bandra, Goregaon West, Powai, and Thane, offering floodlit artificial pitches with evening and midnight slots.'
      },
      {
        question: 'What is the average hourly turf booking price in Mumbai?',
        answer: 'Hourly rates for artificial cricket and football turfs in Mumbai typically range between ₹1,000 to ₹2,500 per hour depending on prime evening slots and weekend peak hours.'
      },
      {
        question: 'Are night/late-night slots available at Mumbai turfs?',
        answer: 'Yes, most verified turfs operate high-lux LED floodlights with slot bookings open until 11:00 PM or midnight, with instant digital confirmation.'
      }
    ]
  },
  bengaluru: {
    name: 'Bengaluru',
    state: 'Karnataka',
    tagline: 'Book BWF-certified synthetic badminton courts, FIFA-grade football astroturfs, and box cricket facilities in Indiranagar, Koramangala, Whitefield, and HSR Layout.',
    popularAreas: ['Indiranagar', 'Koramangala', 'HSR Layout', 'Whitefield', 'Bellandur', 'JP Nagar', 'Electronic City'],
    metaTitle: 'Turf Booking & Badminton Courts in Bengaluru',
    metaDescription: 'Reserve synthetic badminton courts, box cricket pitches, and artificial football turfs in Bangalore. Verified amenities, BWF mats, and instant confirmation.',
    faqs: [
      {
        question: 'Where can I find BWF-standard badminton courts in Bengaluru?',
        answer: 'Indiranagar (100 Feet Ring Road), Koramangala, and HSR Layout feature world-class indoor sports facilities with non-slip vinyl BWF mats and anti-glare vertical lighting.'
      },
      {
        question: 'Do Bengaluru sports turfs allow studded football boots?',
        answer: 'Artificial turfs permit turf trainers (TF) or multi-ground (AG) boots with short rubber studs. Hard plastic or metal studs are strictly prohibited to preserve the synthetic grass.'
      },
      {
        question: 'Can I participate in weekend corporate cricket leagues in Bengaluru?',
        answer: 'Yes, TurfSpot regularly hosts amateur and corporate cricket leagues across Bangalore partner arenas with live digital scoring and prize pools.'
      }
    ]
  },
  pune: {
    name: 'Pune',
    state: 'Maharashtra',
    tagline: 'Explore premier sports turfs, box cricket arenas, and football pitches across Baner, Kothrud, Viman Nagar, Hinjawadi, and Wakad.',
    popularAreas: ['Baner', 'Kothrud', 'Viman Nagar', 'Hinjawadi', 'Wakad', 'Kalyani Nagar', 'Hadapsar'],
    metaTitle: 'Sports Grounds & Turf Booking in Pune',
    metaDescription: 'Instant booking for box cricket turfs, futsal grounds, and badminton courts in Pune. Check real-time slots, amenities, and tournament fixtures.',
    faqs: [
      {
        question: 'Which Pune localities have the best sports turfs?',
        answer: 'Baner (near High Street), Viman Nagar, Kothrud, and Hinjawadi offer modern multi-sport facilities with ample parking and changing rooms.'
      },
      {
        question: 'How do I book a football ground in Pune online?',
        answer: 'Select your preferred ground on TurfSpot, pick an available morning or evening hour, and checkout securely. You receive an entry ticket immediately.'
      }
    ]
  },
  delhi: {
    name: 'Delhi NCR',
    state: 'National Capital Region',
    tagline: 'Book premier sports turfs, box cricket grounds, and badminton facilities across South Delhi, Gurugram, Noida, and Dwarka.',
    popularAreas: ['South Delhi', 'Gurugram', 'Noida', 'Dwarka', 'Rohini', 'Saket', 'Ghaziabad'],
    metaTitle: 'Turf Booking & Sports Arenas in Delhi NCR',
    metaDescription: 'Book verified cricket turfs, football grounds, and synthetic badminton courts in Delhi, Gurugram, and Noida. Floodlit night matches and corporate tournaments.',
    faqs: [
      {
        question: 'What sports are available for booking in Delhi NCR?',
        answer: 'TurfSpot partners in Delhi NCR provide box cricket turfs, 5v5/7v7 football grounds, synthetic indoor badminton courts, and pickleball arenas.'
      },
      {
        question: 'Are floodlit evening slots available in Delhi turfs?',
        answer: 'Yes, floodlit evening hours from 6:00 PM to midnight are available for instant online reservation with verified availability.'
      }
    ]
  }
};

async function getCityVenues(cityName) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/venues?city=${encodeURIComponent(cityName)}`, {
      next: { revalidate: 120 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn(`Failed to fetch venues for city ${cityName}:`, err.message);
    return [];
  }
}

async function getCityTournaments(cityName) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/tournaments?city=${encodeURIComponent(cityName)}&limit=6`, {
      next: { revalidate: 120 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn(`Failed to fetch tournaments for city ${cityName}:`, err.message);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const citySlug = params.city.toLowerCase();
  const cityInfo = CITY_METADATA[citySlug] || {
    name: params.city.charAt(0).toUpperCase() + params.city.slice(1),
    metaTitle: `Sports Turfs & Ground Booking in ${params.city}`,
    metaDescription: `Discover and book top-rated sports turfs, box cricket pitches, and football grounds in ${params.city}. Real-time slots and instant confirmation.`
  };

  const canonicalPath = `/city/${citySlug}`;

  return buildMetadata({
    title: cityInfo.metaTitle,
    description: cityInfo.metaDescription,
    path: canonicalPath,
    keywords: [
      `cricket turf in ${cityInfo.name.toLowerCase()}`,
      `football ground in ${cityInfo.name.toLowerCase()}`,
      `badminton court in ${cityInfo.name.toLowerCase()}`,
      `turf booking ${cityInfo.name.toLowerCase()}`,
      `sports tournaments in ${cityInfo.name.toLowerCase()}`
    ]
  });
}

export async function generateStaticParams() {
  return Object.keys(CITY_METADATA).map((city) => ({ city }));
}

export default async function CityLandingPage({ params }) {
  const citySlug = params.city.toLowerCase();
  const cityInfo = CITY_METADATA[citySlug] || {
    name: params.city.charAt(0).toUpperCase() + params.city.slice(1),
    state: 'India',
    tagline: `Discover verified sports turfs, box cricket pitches, and synthetic courts across ${params.city}.`,
    popularAreas: ['City Center', 'Suburbs', 'Sports Complex Area'],
    faqs: [
      {
        question: `How to book sports turfs in ${params.city}?`,
        answer: `Browse verified arenas in ${params.city}, select court type, pick an available slot, and confirm instantly with verified booking assurance.`
      }
    ]
  };

  const [venues, tournaments] = await Promise.all([
    getCityVenues(cityInfo.name),
    getCityTournaments(cityInfo.name)
  ]);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Locations', url: '/search' },
    { name: cityInfo.name, url: `/city/${citySlug}` }
  ];

  const jsonLdBreadcrumb = buildBreadcrumbSchema(breadcrumbs);
  const jsonLdFaq = buildFaqSchema(cityInfo.faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      {jsonLdFaq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
      )}

      {/* ── City Hero Banner ── */}
      <section className="hero-section" style={{ padding: 'clamp(2.5rem, 5vw, 4.5rem) 0 clamp(2rem, 4vw, 3.5rem)' }}>
        <div className="container">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-muted)' }}>
              <li><Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Home</Link></li>
              <li>&rsaquo;</li>
              <li><Link href="/search" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Cities</Link></li>
              <li>&rsaquo;</li>
              <li style={{ color: 'var(--text-heading)', fontWeight: 700 }}>{cityInfo.name}</li>
            </ol>
          </nav>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent-primary-glow)',
            border: '1px solid var(--border-glow)',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            marginBottom: '1.25rem'
          }}>
            <MapPin size={16} /> Verified Sports Hub in {cityInfo.state}
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.3rem)', lineHeight: 1.15, marginBottom: '1rem', color: 'var(--text-heading)' }}>
            Sports Turfs &amp; Grounds in <span className="hero-highlight">{cityInfo.name}</span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '780px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            {cityInfo.tagline}
          </p>

          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/search?city=${encodeURIComponent(cityInfo.name)}`}
              className="btn btn-primary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
            >
              <Compass size={18} />
              <span>Explore All {cityInfo.name} Slots</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Popular Localities Tag Cloud ── */}
      {cityInfo.popularAreas && (
        <section className="container" style={{ margin: 'clamp(1.5rem, 3vw, 2.5rem) auto' }}>
          <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={16} color="var(--accent-primary)" /> Key Localities in {cityInfo.name}:
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {cityInfo.popularAreas.map((area, i) => (
                <Link
                  key={i}
                  href={`/search?city=${encodeURIComponent(cityInfo.name)}&q=${encodeURIComponent(area)}`}
                  style={{
                    background: 'var(--bg-tag)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    textDecoration: 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {area}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Verified Venues Grid ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.35rem' }}>
              Verified Sports Venues in {cityInfo.name}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Real-time availability, floodlights, parking, and instant slot confirmation.
            </p>
          </div>
          <Link
            href={`/search?city=${encodeURIComponent(cityInfo.name)}`}
            style={{ color: 'var(--accent-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}
          >
            <span>See all {cityInfo.name} venues ({venues.length})</span> &rarr;
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No venues currently found in {cityInfo.name}. Try browsing other metropolitan hubs.</p>
          </div>
        ) : (
          <div className="venue-grid" style={{ marginTop: 0 }}>
            {venues.map((venue) => (
              <div key={venue.id} className="glass-panel venue-card">
                <div className="venue-card-image">
                  <img
                    src={venue.primaryImage || venue.images?.[0] || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80'}
                    alt={`${venue.name} in ${venue.city}`}
                    loading="lazy"
                    width={600}
                    height={200}
                  />
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span className="badge badge-success">
                      <Star size={12} fill="currentColor" /> {venue.avg_rating ? parseFloat(venue.avg_rating).toFixed(1) : '4.8'}
                    </span>
                  </div>
                </div>

                <div className="venue-card-body">
                  <h3 className="venue-title">
                    <Link href={`/venue/${venue.slug || venue.id}`}>{venue.name}</Link>
                  </h3>
                  <div className="venue-location">
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>{venue.address ? `${venue.address}, ${venue.city}` : venue.city}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Starts at</span>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--accent-primary)' }}>
                        ₹{venue.starting_price || 1000}/hr
                      </strong>
                    </div>
                    <Link href={`/venue/${venue.slug || venue.id}`} className="btn btn-primary btn-sm">
                      Book Slot
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── City Tournaments ── */}
      {tournaments.length > 0 && (
        <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.35rem' }}>
                Sports Tournaments in {cityInfo.name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Compete in regional leagues with live ball-by-ball scorecards and digital signage.
              </p>
            </div>
            <Link
              href="/tournaments"
              style={{ color: 'var(--accent-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}
            >
              <span>View all tournaments</span> &rarr;
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
            {tournaments.map((t) => (
              <div key={t.id} className="glass-panel tournament-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="badge badge-success">{t.status || 'ONGOING'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.city}</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  <Link href={`/tournaments/${t.id}`} style={{ color: 'var(--text-heading)' }}>{t.name}</Link>
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {t.description}
                </p>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t.format || 'KNOCKOUT'} Format</span>
                  <Link href={`/tournaments/${t.id}`} className="btn btn-outline btn-sm">
                    View Fixtures
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Local City FAQs ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 4rem) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.4rem' }}>
            Frequently Asked Questions — {cityInfo.name} Sports Turfs
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Helpful answers to common questions about booking and playing in {cityInfo.name}.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px', margin: '0 auto' }}>
          {cityInfo.faqs.map((faq, index) => (
            <div key={index} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                {faq.question}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
