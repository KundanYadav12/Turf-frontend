import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer-root">
      <div className="container">
        <div className="footer-grid">

          {/* Brand */}
          <div>
            <div className="brand-logo" style={{ marginBottom: '0.85rem' }}>
              <Trophy size={24} color="var(--accent-primary)" />
              <span>TurfSpot</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', maxWidth: 320 }}>
              The complete sports booking, turf management, team organizing, and match scoring SaaS platform.
            </p>
          </div>

          {/* Sports */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-heading)' }}>Active Sports</h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>🏏 Cricket Turfs &amp; Box Pits</li>
              <li>⚽ Football Pitches (5v5 &amp; 7v7)</li>
              <li>🏸 Synthetic Badminton Courts</li>
              <li style={{ opacity: 0.55 }}>🎾 Tennis (Coming Soon)</li>
              <li style={{ opacity: 0.55 }}>🏀 Basketball (Coming Soon)</li>
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-heading)' }}>Popular Cities</h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Mumbai</li>
              <li>Bengaluru</li>
              <li>Delhi NCR</li>
              <li>Hyderabad</li>
              <li>Pune</li>
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-heading)' }}>For Venue Owners</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.85rem', lineHeight: '1.5' }}>
              List your turf/courts, automate slot bookings, manage walk-in customers, and maximize revenue.
            </p>
            <a href="/register" className="btn btn-outline btn-sm">
              <Sparkles size={14} /> Partner With Us
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div suppressHydrationWarning style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          color: 'var(--text-dim)',
          fontSize: '0.8rem',
          lineHeight: 1.5
        }}>
          <div>
            © {new Date().getFullYear()} TurfSpot Platform. All rights reserved. Built with precision SaaS architecture.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <a href="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="footer-link">
              Privacy Policy
            </a>
            <a href="/delete-account" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="footer-link">
              Account Deletion
            </a>
            <a href="/tv" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }} className="footer-link">
              📺 Smart TV Mode
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
