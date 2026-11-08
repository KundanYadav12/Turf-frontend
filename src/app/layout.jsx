import React from 'react';
import Providers from '../components/providers/Providers';
import AppShell from '../components/layout/AppShell';
import { buildOrganizationSchema, buildWebSiteSchema, SITE_URL } from '../lib/seo';
import '../styles/index.css';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'TurfSpot — Book Sports Turfs, Box Cricket & Football Grounds',
    template: '%s | TurfSpot'
  },
  description: 'Instant slot booking for FIFA-standard football turfs, box cricket pitches, synthetic badminton courts, live scoring & tournaments with zero double-booking guarantee.',
  keywords: [
    'turf booking',
    'box cricket',
    'football turf',
    'badminton courts',
    'sports facility booking',
    'live cricket scorer',
    'sports tournaments',
    'turf near me'
  ],
  authors: [{ name: 'TurfSpot Sports Network' }],
  creator: 'TurfSpot Platform',
  publisher: 'TurfSpot Platform',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'TurfSpot — Book Sports Turfs & Football Grounds Instantly',
    description: 'Find top-rated box cricket turfs, football pitches, synthetic courts and participate in competitive leagues.',
    url: SITE_URL,
    siteName: 'TurfSpot',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TurfSpot Sports Platform'
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TurfSpot — Book Sports Turfs & Football Grounds',
    description: 'Instant turf slot bookings, live multi-match scorer & tournament hub.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: './',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  }
};

export const viewport = {
  themeColor: '#090d16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const jsonLdOrg = buildOrganizationSchema();
  const jsonLdWebSite = buildWebSiteSchema();

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('turf_theme');if(!t){var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;t=prefersDark?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){}})();`
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
