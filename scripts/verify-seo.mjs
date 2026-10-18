async function test() {
  const routes = [
    '/',
    '/robots.txt',
    '/sitemap.xml',
    '/sports/cricket',
    '/sports/football',
    '/sports/badminton',
    '/sports/pickleball',
    '/sports/turf-booking',
    '/city/mumbai',
    '/city/bengaluru',
    '/search',
    '/tournaments',
    '/teams',
    '/venue/1',
    '/my-bookings'
  ];


  console.log('====================================================');
  console.log('🚀 Next.js SEO & Route Architecture Verification');
  console.log('====================================================');

  for (const r of routes) {
    try {
      const res = await fetch('http://localhost:3001' + r);
      const text = await res.text();
      console.log(`\n➡️ [${res.status}] ${r} (${text.length} bytes)`);

      if (r === '/') {
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        const descMatch = text.match(/<meta name="description" content="(.*?)"/);
        const hasJsonLd = text.includes('application/ld+json');
        console.log(`   Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
        console.log(`   Description: ${descMatch ? descMatch[1] : 'N/A'}`);
        console.log(`   JSON-LD Schema Present: ${hasJsonLd}`);
      } else if (r === '/robots.txt') {
        console.log('   --- robots.txt content ---');
        console.log(text.trim());
        console.log('   --------------------------');
      } else if (r === '/sitemap.xml') {
        console.log('   --- sitemap.xml snippet ---');
        console.log(text.slice(0, 350) + '...');
        console.log('   ---------------------------');
      } else if (r === '/venue/1') {
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        const hasSportsActivityLocation = text.includes('SportsActivityLocation');
        console.log(`   Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
        console.log(`   Has SportsActivityLocation Schema: ${hasSportsActivityLocation}`);
      } else if (r === '/tournaments') {
        const titleMatch = text.match(/<title>(.*?)<\/title>/);
        console.log(`   Title: ${titleMatch ? titleMatch[1] : 'N/A'}`);
      } else if (r === '/api/sports') {
        const json = JSON.parse(text);
        console.log(`   API Proxy working: success = ${json.success}, sports count = ${json.data?.length}`);
      }
    } catch (err) {
      console.error(`❌ Failed on ${r}:`, err.message);
    }
  }
  console.log('\n====================================================');
  console.log('✅ Verification Completed');
  console.log('====================================================');
}

test();
