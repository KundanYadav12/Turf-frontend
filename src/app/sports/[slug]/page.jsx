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
  Trophy,
  MapPin,
  Calendar,
  Star,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  HelpCircle
} from 'lucide-react';

export const revalidate = 120;

// Sport content registry with authoritative sports specifications and FAQs
const SPORTS_CONTENT = {
  cricket: {
    name: 'Box Cricket & Turf Pitches',
    sportKey: 'cricket',
    h1: 'Book Box Cricket Turfs & Indoor Pitches Near You',
    metaTitle: 'Box Cricket Turf Booking & Tournament Arenas',
    metaDescription: 'Instant booking for box cricket turfs and floodlit artificial pitches. Compare hourly rates, book real-time slots, and join competitive cricket tournaments.',
    icon: '🏏',
    heroBadge: 'FIFA & ICC Certified Synthetic Turf',
    tagline: 'High-bounce rubber infill pitches, seamless netting, and floodlit arenas built for intense night matches.',
    specs: [
      { label: 'Pitch Surface', value: '15mm–25mm High-Density Artificial Turf with Shock Absorption' },
      { label: 'Standard Dimensions', value: 'Box Cricket: 80ft × 45ft to 120ft × 60ft with 20ft ceiling clearance' },
      { label: 'Lighting Quality', value: '350–500 Lux anti-glare LED sports floodlights' },
      { label: 'Footwear Permitted', value: 'Flat-sole turf trainers or sports sneakers (metal/plastic spikes prohibited)' }
    ],
    faqs: [
      {
        question: 'How do I book a box cricket turf on TurfSpot?',
        answer: 'Search your city or locality, select your preferred cricket turf, choose an available date and time slot, and confirm your booking instantly. You receive a verified QR entry ticket with zero double-booking guarantee.'
      },
      {
        question: 'Are cricket balls and bats provided at the venue?',
        answer: 'Most verified partner turfs provide standard tennis balls and wooden cricket bats on request. Check the amenities section on the individual venue page for equipment availability.'
      },
      {
        question: 'What is the cancellation policy for box cricket turf bookings?',
        answer: 'Full refunds are provided up to 12 to 24 hours prior to the slot time depending on the venue policy. You can manage or cancel your reservation directly from the My Bookings portal.'
      },
      {
        question: 'Can we host our own corporate or amateur cricket tournament?',
        answer: 'Yes! Use our Tournament Hub to create multi-team tournaments, generate knockout and league fixtures, manage player auctions, and run real-time live scoring with digital signage.'
      }
    ]
  },
  football: {
    name: 'Football Turfs & Futsal Grounds',
    sportKey: 'football',
    h1: 'Book 5v5 & 7v7 Football Turfs & Futsal Grounds',
    metaTitle: 'Football Turf Booking & Futsal Grounds',
    metaDescription: 'Book FIFA-standard artificial football turfs and 5v5/7v7 futsal grounds with real-time availability. Floodlit night slots and regional football leagues.',
    icon: '⚽',
    heroBadge: 'FIFA Quality Pro Certified Astroturf',
    tagline: 'Play on resilient 40mm–50mm monofilament turf pitches with certified shock pads, perimeter rebound netting, and high-lux illumination.',
    specs: [
      { label: 'Pitch Dimensions', value: '5v5: 35m × 20m | 7v7: 50m × 30m | Futsal: 40m × 20m' },
      { label: 'Turf Construction', value: 'Monofilament PE fibers with graded silica sand and SBR rubber granules' },
      { label: 'Lighting Standards', value: '400+ Lux uniform coverage suitable for high-speed night matches' },
      { label: 'Footwear Permitted', value: 'Turf shoes (TF) or multi-ground cleats (AG). Metal studs are strictly banned.' }
    ],
    faqs: [
      {
        question: 'What size football pitches are available for booking?',
        answer: 'Our verified venues offer 5v5, 6v6, and 7v7 artificial turf grounds as well as indoor hardwood futsal courts.'
      },
      {
        question: 'Are changing rooms and drinking water available at the grounds?',
        answer: 'Yes, verified partner facilities feature hygienic changing rooms, washrooms, drinking water stations, and dedicated seating dugouts.'
      },
      {
        question: 'Can we track live football scores and tournament standings?',
        answer: 'Yes, TurfSpot includes a dedicated multi-sport live scoring engine with goal recording, yellow/red cards, substitutions, and automatic points table calculations.'
      }
    ]
  },
  badminton: {
    name: 'Synthetic Badminton Courts',
    sportKey: 'badminton',
    h1: 'Book BWF-Standard Indoor Badminton Courts',
    metaTitle: 'Badminton Court Booking & Indoor Arenas',
    metaDescription: 'Instant booking for synthetic and wooden indoor badminton courts. High-traction BWF-approved mats, anti-glare lighting, and amateur leagues.',
    icon: '🏸',
    heroBadge: 'BWF Standard Synthetic PVC & Wooden Courts',
    tagline: 'Multi-layer non-slip PVC sports flooring with anti-glare vertical lighting and climate control for professional-grade rallies.',
    specs: [
      { label: 'Court Dimensions', value: 'Doubles: 13.4m × 6.1m | Singles: 13.4m × 5.18m with 9m clear height' },
      { label: 'Flooring Surface', value: '4.5mm–6.5mm BWF Grade PVC Vinyl Mats or Teak Wood with suspension' },
      { label: 'Lighting Rig', value: 'Diffuse side-mounted LED lamps preventing player ceiling glare' },
      { label: 'Mandatory Footwear', value: 'Non-marking gum-sole badminton shoes only (strictly enforced for court longevity)' }
    ],
    faqs: [
      {
        question: 'Are non-marking shoes mandatory for badminton court bookings?',
        answer: 'Yes, all indoor synthetic and wooden badminton courts require non-marking rubber shoes to protect the court surface. Many venues also offer shoe rentals on-site.'
      },
      {
        question: 'Do venues provide shuttlecocks and racquets?',
        answer: 'Partner facilities generally provide racquets for rent and sell nylon and feather shuttlecocks at the reception.'
      },
      {
        question: 'Can I book recurring weekly slots for badminton practice?',
        answer: 'Yes, you can reserve recurring time slots or block specific morning/evening practice hours through our venue scheduling portal.'
      }
    ]
  },
  pickleball: {
    name: 'Pickleball Courts & Tournaments',
    sportKey: 'pickleball',
    h1: 'Book Pickleball Courts & Join Competitive Leagues',
    metaTitle: 'Pickleball Court Booking & Tournaments',
    metaDescription: 'Find and book dedicated indoor and outdoor pickleball courts. Certified non-slip acrylic surfaces, regulation net heights, and community tournaments.',
    icon: '⚡',
    heroBadge: 'Official USAPA & Global Regulation Courts',
    tagline: 'Experience the fastest-growing racquet sport on precision-coated acrylic courts with official kitchen zones and regulation net tensioning.',
    specs: [
      { label: 'Court Dimensions', value: '44ft × 20ft with a 7ft non-volley zone (kitchen) on each side of the net' },
      { label: 'Net Height', value: '36 inches at the sidelines, 34 inches at the center strap' },
      { label: 'Surface Coating', value: 'Multi-layer cushioned acrylic with silica aggregate for consistent ball response' },
      { label: 'Equipment Needed', value: 'Composite or carbon-fiber paddle and official indoor/outdoor perforated pickleball' }
    ],
    faqs: [
      {
        question: 'What is pickleball and how does scoring work?',
        answer: 'Pickleball combines elements of tennis, badminton, and ping-pong. Games are played to 11 points (win by 2), and only the serving side can score points.'
      },
      {
        question: 'Are pickleball paddles and balls provided at the venues?',
        answer: 'Most partner facilities provide beginner paddles and USAPA-approved balls with your court reservation.'
      },
      {
        question: 'How do I enter a pickleball tournament on TurfSpot?',
        answer: 'Visit the Tournaments Hub, browse upcoming pickleball leagues, and register your team or singles entry with instant online confirmation.'
      }
    ]
  },
  'turf-booking': {
    name: 'Sports Turf & Arena Booking Guide',
    sportKey: 'turf-booking',
    h1: 'Complete Sports Turf Booking & Facility Guide',
    metaTitle: 'Sports Turf Booking Guide & Arena Management',
    metaDescription: 'Find top-rated sports turfs, box cricket grounds, and football arenas. Real-time slot availability, instant booking confirmation, and tournament hosting.',
    icon: '🏟️',
    heroBadge: 'Zero Double-Booking Guarantee Platform',
    tagline: 'Discover verified sports venues across Mumbai, Bengaluru, Pune, and Delhi NCR with transparent pricing and instant digital entry tickets.',
    specs: [
      { label: 'Supported Sports', value: 'Box Cricket, 5v5/7v7 Football, Badminton, Pickleball, Tennis, and Futsal' },
      { label: 'Booking System', value: 'Sub-second real-time slot locking with atomic database transactions' },
      { label: 'Access Verification', value: 'Secure dynamic QR code tickets scanned at venue turnstiles' },
      { label: 'Platform Security', value: 'PCI-compliant payment processing with instant digital receipts' }
    ],
    faqs: [
      {
        question: 'How does TurfSpot prevent double-booking of turf slots?',
        answer: 'TurfSpot uses database-level row locking with a 10-minute slot holding window during checkout. Once a player initiates booking, that slot is instantly unavailable to anyone else.'
      },
      {
        question: 'Can venue owners manage offline walk-in bookings alongside online slots?',
        answer: 'Yes! The Venue Owner Dashboard includes an offline walk-in booking console that seamlessly syncs with the public calendar, ensuring synchronized slot availability.'
      },
      {
        question: 'Are refunds provided if rain interrupts our match?',
        answer: 'Venues have transparent weather and cancellation policies displayed on each venue detail page. Most partner facilities provide slot rescheduling in case of severe weather.'
      }
    ]
  }
};

// Fetch real venues for this sport from the backend
async function getSportVenues(sportKey) {
  try {
    const sportParam = sportKey === 'turf-booking' ? '' : `sport=${encodeURIComponent(sportKey)}`;
    const url = `${BACKEND_URL}/api/venues${sportParam ? `?${sportParam}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn(`Failed to fetch venues for ${sportKey}:`, err.message);
    return [];
  }
}

// Fetch real tournaments for this sport
async function getSportTournaments(sportKey) {
  try {
    const sportParam = sportKey === 'turf-booking' ? '' : `sportSlug=${encodeURIComponent(sportKey)}`;
    const url = `${BACKEND_URL}/api/tournaments?limit=6${sportParam ? `&${sportParam}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.warn(`Failed to fetch tournaments for ${sportKey}:`, err.message);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const content = SPORTS_CONTENT[params.slug];
  if (!content) {
    return {
      title: 'Sport Not Found | TurfSpot',
      description: 'The requested sports category is not listed.'
    };
  }

  const canonicalPath = `/sports/${params.slug}`;
  const keywords = SEO_KEYWORDS[params.slug] || SEO_KEYWORDS.general;

  return buildMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: canonicalPath,
    keywords: [
      `${content.name.toLowerCase()} booking`,
      `${content.sportKey} turf near me`,
      ...keywords
    ]
  });
}

export async function generateStaticParams() {
  return Object.keys(SPORTS_CONTENT).map((slug) => ({ slug }));
}

export default async function SportLandingPage({ params }) {
  const content = SPORTS_CONTENT[params.slug];
  if (!content) {
    notFound();
  }

  const [venues, tournaments] = await Promise.all([
    getSportVenues(content.sportKey),
    getSportTournaments(content.sportKey)
  ]);

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Sports', url: '/search' },
    { name: content.name, url: `/sports/${params.slug}` }
  ];

  const jsonLdBreadcrumb = buildBreadcrumbSchema(breadcrumbs);
  const jsonLdFaq = buildFaqSchema(content.faqs);

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

      {/* ── Hero Banner ── */}
      <section className="hero-section" style={{ padding: 'clamp(2.5rem, 5vw, 4.5rem) 0 clamp(2rem, 4vw, 3.5rem)' }}>
        <div className="container">
          {/* Breadcrumb nav */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', color: 'var(--text-muted)' }}>
              <li><Link href="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Home</Link></li>
              <li>&rsaquo;</li>
              <li><Link href="/search" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Sports Directory</Link></li>
              <li>&rsaquo;</li>
              <li style={{ color: 'var(--text-heading)', fontWeight: 700 }}>{content.name}</li>
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
            <Zap size={16} /> {content.heroBadge}
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 1.15, marginBottom: '1rem', color: 'var(--text-heading)' }}>
            {content.h1}
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--text-muted)', maxWidth: '780px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            {content.tagline}
          </p>

          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/search?sport=${content.sportKey === 'turf-booking' ? '' : content.sportKey}`}
              className="btn btn-primary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}
            >
              <span>{content.icon} Search {content.name} Slots</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/tournaments"
              className="btn btn-secondary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Trophy size={18} color="var(--accent-amber)" />
              <span>Explore Tournaments</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Technical Specifications Section ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.4rem' }}>
            Professional Facility Standards &amp; Court Specifications
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '650px', margin: '0 auto' }}>
            Every partner venue on TurfSpot is physically verified for player safety, lighting compliance, and surface quality.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
          {content.specs.map((spec, i) => (
            <div key={i} className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>{spec.label}</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {spec.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Available Venues for this Sport ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.35rem' }}>
              Top Verified {content.name} Arenas
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Live availability, certified turf surfaces, and transparent hourly rates.
            </p>
          </div>
          <Link
            href={`/search?sport=${content.sportKey === 'turf-booking' ? '' : content.sportKey}`}
            style={{ color: 'var(--accent-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}
          >
            <span>View all arenas ({venues.length})</span> &rarr;
          </Link>
        </div>

        {venues.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No venues currently listed for this category. Check other sports arenas.</p>
          </div>
        ) : (
          <div className="venue-grid" style={{ marginTop: 0 }}>
            {venues.slice(0, 6).map((venue) => (
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

      {/* ── Active Tournaments for this Sport ── */}
      {tournaments.length > 0 && (
        <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', marginBottom: '0.35rem' }}>
                Competitive {content.name} Leagues &amp; Tournaments
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Compete in floodlit knockout and league formats with official digital scorecards.
              </p>
            </div>
            <Link
              href="/tournaments"
              style={{ color: 'var(--accent-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}
            >
              <span>View all leagues</span> &rarr;
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem', flex: 1 }}>
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

      {/* ── Local City Hub Quick Links ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
        <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>
            Find {content.name} by City
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Instant bookings and floodlit arenas across top metropolitan sports hubs:
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { name: 'Mumbai', slug: 'mumbai' },
              { name: 'Bengaluru', slug: 'bengaluru' },
              { name: 'Pune', slug: 'pune' },
              { name: 'Delhi NCR', slug: 'delhi' }
            ].map((city) => (
              <Link
                key={city.slug}
                href={`/city/${city.slug}`}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <MapPin size={14} color="var(--accent-primary)" />
                <span>{city.name} {content.name.split(' ')[0]} Turfs</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 4rem) auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <HelpCircle size={16} /> Frequently Asked Questions
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)' }}>
            Everything You Need to Know About {content.name}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px', margin: '0 auto' }}>
          {content.faqs.map((faq, index) => (
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
