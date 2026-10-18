import { SITE_URL } from '../lib/seo';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sports/*',
          '/city/*',
          '/venue/*',
          '/tournaments/*',
          '/teams/*',
          '/matches/*',
          '/players/*',
          '/_next/static/',
          '/favicon.svg',
          '/og-image.jpg'
        ],
        disallow: [
          '/admin/',
          '/owner/',
          '/my-bookings',
          '/api/',
          '/display/',
          '/*?*redirect=*',
          '/*?*token=*'
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/sports/*',
          '/city/*',
          '/venue/*',
          '/tournaments/*',
          '/teams/*',
          '/matches/*',
          '/players/*',
          '/_next/static/',
          '/og-image.jpg'
        ],
        disallow: [
          '/admin/',
          '/owner/',
          '/my-bookings',
          '/api/',
          '/display/'
        ],
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
