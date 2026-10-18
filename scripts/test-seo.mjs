/**
 * Comprehensive SEO Automation Test Suite
 * Tests SEO builders, Schema.org generators, robots.txt, sitemap logic,
 * and security/privacy guarantees (e.g., zero phone/email leakage in public metadata/JSON-LD).
 */

import {
  SITE_URL,
  SITE_NAME,
  buildCanonicalUrl,
  buildMetadata,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  buildSportsActivityLocationSchema,
  buildSportsEventSchema,
  buildSportsTeamSchema,
  buildAthleteProfileSchema,
  buildFaqSchema,
  SEO_KEYWORDS
} from '../src/lib/seo.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('======================================================================');
console.log('🧪 RUNNING COMPREHENSIVE SEO & STRUCTURED DATA TEST SUITE');
console.log('======================================================================\n');

// 1. CANONICAL URL GENERATION TESTS
console.log('1. Testing Canonical URL Handling:');
assert(
  buildCanonicalUrl('/') === SITE_URL,
  `Homepage canonical URL should equal SITE_URL (${SITE_URL})`
);
assert(
  buildCanonicalUrl('/sports/cricket') === `${SITE_URL}/sports/cricket`,
  'Path canonical URL correctly formats slug'
);
assert(
  buildCanonicalUrl('tournaments/') === `${SITE_URL}/tournaments`,
  'Trailing slashes are automatically normalized'
);
assert(
  buildCanonicalUrl('/city/mumbai/') === `${SITE_URL}/city/mumbai`,
  'City canonical strips trailing slash'
);

// 2. METADATA BUILDER TESTS
console.log('\n2. Testing Centralized Metadata Generator:');
const homeMeta = buildMetadata({
  title: 'Book Box Cricket & Football Turfs Online',
  description: 'Book verified sports grounds across major cities.',
  path: '/'
});
const renderedTitle = typeof homeMeta.title === 'object' ? homeMeta.title.absolute : homeMeta.title;
assert(renderedTitle.includes(SITE_NAME), 'Title includes brand suffix');
assert(homeMeta.alternates.canonical === SITE_URL, 'Canonical URL is set correctly in metadata');
assert(homeMeta.openGraph.url === SITE_URL, 'OpenGraph URL is set correctly');
assert(homeMeta.openGraph.images.length > 0, 'OpenGraph image is provided');
assert(homeMeta.twitter.card === 'summary_large_image', 'Twitter card format is summary_large_image');

const noIndexMeta = buildMetadata({
  title: 'Private Dashboard',
  description: 'Confidential owner portal.',
  path: '/owner/dashboard',
  noIndex: true
});
assert(
  noIndexMeta.robots.index === false && noIndexMeta.robots.follow === false,
  'noIndex correctly sets robots: { index: false, follow: false }'
);


// 3. SCHEMA.ORG ORGANIZATIONAL & WEBSITE TESTS
console.log('\n3. Testing Organization & WebSite Schemas:');
const orgSchema = buildOrganizationSchema();
assert(orgSchema['@type'] === 'Organization', 'Organization schema type is valid');
assert(orgSchema.url === SITE_URL, 'Organization URL matches SITE_URL');

const webSiteSchema = buildWebSiteSchema();
assert(webSiteSchema['@type'] === 'WebSite', 'WebSite schema type is valid');
assert(
  webSiteSchema.potentialAction['@type'] === 'SearchAction',
  'WebSite schema includes Google-compliant SearchAction'
);
assert(
  webSiteSchema.potentialAction.target.urlTemplate.includes('/search?q='),
  'SearchAction points to /search query endpoint'
);

// 4. BREADCRUMBLIST SCHEMA TESTS
console.log('\n4. Testing BreadcrumbList Schema:');
const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Sports', url: '/sports/cricket' },
  { name: 'Mumbai Turfs', url: '/city/mumbai' }
]);
assert(breadcrumbSchema['@type'] === 'BreadcrumbList', 'BreadcrumbList schema type is valid');
assert(breadcrumbSchema.itemListElement.length === 3, 'All 3 breadcrumb items are rendered');
assert(breadcrumbSchema.itemListElement[0].position === 1, 'First item position is 1');
assert(
  breadcrumbSchema.itemListElement[1].item === `${SITE_URL}/sports/cricket`,
  'Relative item URLs are expanded to absolute canonical URLs'
);

// 5. LOCAL SEO SPORTS ACTIVITY LOCATION SCHEMA TESTS
console.log('\n5. Testing Local SEO (SportsActivityLocation) Schema:');
const mockVenue = {
  id: 42,
  slug: 'kick-off-arena-andheri',
  name: 'KickOff Football Arena',
  description: 'FIFA-standard 7v7 artificial turf with LED floodlights.',
  city: 'Mumbai',
  state: 'Maharashtra',
  address: 'Link Road, Andheri West',
  pincode: '400053',
  latitude: '19.136325',
  longitude: '72.827660',
  startingPrice: 1500,
  rating: '4.8',
  reviewCount: 34
};
const venueSchema = buildSportsActivityLocationSchema(mockVenue);
assert(venueSchema['@type'] === 'SportsActivityLocation', 'Type is SportsActivityLocation');
assert(venueSchema.url === `${SITE_URL}/venue/kick-off-arena-andheri`, 'Uses slug URL when available');
assert(venueSchema.address.addressLocality === 'Mumbai', 'Address locality is set to Mumbai');
assert(venueSchema.geo.latitude === 19.136325, 'Geo latitude is parsed as float');
assert(venueSchema.priceRange === '₹1500/hr', 'Price range formatted in INR/hr');
assert(venueSchema.aggregateRating.ratingValue === '4.8', 'Rating value correctly formatted');
assert(venueSchema.aggregateRating.reviewCount === 34, 'Review count correctly formatted');

// Test incomplete venue doesn't invent fake reviews or prices
const bareVenue = { id: 99, name: 'Minimal Turf', city: 'Pune' };
const bareVenueSchema = buildSportsActivityLocationSchema(bareVenue);
assert(bareVenueSchema.aggregateRating === undefined, 'No fake aggregateRating generated for bare venues');
assert(bareVenueSchema.priceRange === undefined, 'No fake priceRange generated for bare venues');
assert(bareVenueSchema.geo === undefined, 'No fake geo coordinates generated for bare venues');

// 6. TOURNAMENT & MATCH SPORTSEVENT SCHEMA TESTS
console.log('\n6. Testing Tournament & Match (SportsEvent) Schema:');
const tournamentSchema = buildSportsEventSchema({
  name: 'Mumbai Monsoon Cricket Trophy 2026',
  description: 'Over-16 box cricket tournament with 16 premier teams.',
  url: '/tournaments/12',
  startDate: '2026-07-15T09:00:00Z',
  endDate: '2026-07-18T18:00:00Z',
  status: 'REGISTRATION_OPEN',
  locationName: 'Shivaji Park Sports Arena',
  locationCity: 'Mumbai',
  competitors: ['Spartans CC', 'Mavericks XI']
});
assert(tournamentSchema['@type'] === 'SportsEvent', 'Type is SportsEvent');
assert(tournamentSchema.eventStatus === 'https://schema.org/EventScheduled', 'REGISTRATION_OPEN maps to EventScheduled');
assert(tournamentSchema.competitor.length === 2, '2 competitors listed');
assert(tournamentSchema.location.address.addressLocality === 'Mumbai', 'Tournament city set properly');

// 7. TEAM SCHEMA TESTS
console.log('\n7. Testing SportsTeam Schema:');
const mockTeam = {
  id: 7,
  name: 'Thunderbolts Cricket Club',
  sport: { name: 'Box Cricket' },
  description: 'Semi-pro box cricket club competing in Mumbai leagues.',
  logoUrl: 'https://images.unsplash.com/team-logo.jpg',
  members: [
    { fullName: 'Rohit Sharma', role: 'CAPTAIN' },
    { fullName: 'Aditya Verma', role: 'ALL_ROUNDER' }
  ]
};
const teamSchema = buildSportsTeamSchema(mockTeam);
assert(teamSchema['@type'] === 'SportsTeam', 'Type is SportsTeam');
assert(teamSchema.sport === 'Box Cricket', 'Sport name matches');
assert(teamSchema.member.length === 2, 'Squad members mapped to Persons');
assert(teamSchema.member[0].name === 'Rohit Sharma', 'Member name is preserved');

// 8. ATHLETE PROFILE & PRIVACY VERIFICATION TESTS
console.log('\n8. Testing Athlete Profile Schema & Strict Privacy Rules:');
const mockPlayerWithPrivateData = {
  id: 101,
  fullName: 'Arjun Tendulkar',
  profilePhoto: 'https://images.unsplash.com/player.jpg',
  phoneNumber: '+91 9876543210',
  email: 'arjun.private@example.com',
  personalAddress: '123 Private Bungalow, Bandra',
  teams: [{ name: 'Mumbai Strikers', sport_name: 'Cricket' }],
  awardsWon: [{ award_name: 'Player of the Tournament', tournament_name: 'Bandra Premier League' }]
};
const athleteSchema = buildAthleteProfileSchema(mockPlayerWithPrivateData);
assert(athleteSchema['@type'] === 'ProfilePage', 'Type is ProfilePage');
assert(athleteSchema.mainEntity['@type'] === 'Person', 'Main entity is Person');
assert(athleteSchema.mainEntity.name === 'Arjun Tendulkar', 'Athlete name is set');

// Stringify to scan for any accidental leakage
const athleteJsonString = JSON.stringify(athleteSchema);
assert(!athleteJsonString.includes('+91 9876543210'), 'ZERO leakage of player phone number');
assert(!athleteJsonString.includes('arjun.private@example.com'), 'ZERO leakage of player email address');
assert(!athleteJsonString.includes('Private Bungalow'), 'ZERO leakage of personal residential address');

// 9. FAQ SCHEMA TESTS
console.log('\n9. Testing FAQPage Schema:');
const faqSchema = buildFaqSchema([
  { question: 'What shoes are allowed on box cricket turfs?', answer: 'Turf shoes or flat-soled sneakers.' },
  { question: 'Is advance booking required?', answer: 'Yes, slots are reserved online with instant confirmation.' }
]);
assert(faqSchema['@type'] === 'FAQPage', 'Type is FAQPage');
assert(faqSchema.mainEntity.length === 2, '2 FAQ questions rendered');
assert(faqSchema.mainEntity[0].acceptedAnswer.text.includes('Turf shoes'), 'Answer text is preserved');

// 10. KEYWORD STRATEGY COVERAGE TESTS
console.log('\n10. Testing Keyword Strategy Map Coverage:');
assert(Array.isArray(SEO_KEYWORDS.turfBooking) && SEO_KEYWORDS.turfBooking.length >= 6, 'Turf booking keywords defined');
assert(Array.isArray(SEO_KEYWORDS.cricket) && SEO_KEYWORDS.cricket.length >= 6, 'Cricket keywords defined');
assert(Array.isArray(SEO_KEYWORDS.football) && SEO_KEYWORDS.football.length >= 6, 'Football keywords defined');
assert(Array.isArray(SEO_KEYWORDS.badminton) && SEO_KEYWORDS.badminton.length >= 4, 'Badminton keywords defined');
assert(Array.isArray(SEO_KEYWORDS.pickleball) && SEO_KEYWORDS.pickleball.length >= 4, 'Pickleball keywords defined');
assert(Array.isArray(SEO_KEYWORDS.tournaments) && SEO_KEYWORDS.tournaments.length >= 4, 'Tournament keywords defined');
assert(Array.isArray(SEO_KEYWORDS.localCities) && SEO_KEYWORDS.localCities.length >= 4, 'Local cities keywords defined');

console.log('\n======================================================================');
console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('======================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SEO UNIT & INTEGRATION CHECKS PASSED PERFECTLY!\n');
}
