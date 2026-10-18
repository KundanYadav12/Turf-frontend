'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Tv, Sparkles, Monitor, Radio, ArrowRight,
  Shield, CheckCircle2, RefreshCw, Loader2, Play
} from 'lucide-react';
import Link from 'next/link';

import { socket } from '../../services/socket';

export default function TVHubPage() {
  const router = useRouter();
  const [pairingCode, setPairingCode] = useState('');
  const [pairingUuid, setPairingUuid] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaired, setIsPaired] = useState(false);

  // Request fresh pairing code for this TV screen
  useEffect(() => {
    async function initPairing() {
      try {
        const [pairRes, tournRes] = await Promise.all([
          axios.post('/api/tv/pair/request-code'),
          axios.get('/api/tournaments')
        ]);

        if (pairRes.data.success && pairRes.data.data) {
          setPairingCode(pairRes.data.data.pairingCode);
          setPairingUuid(pairRes.data.data.tvUuid);
        }

        if (tournRes.data.success && tournRes.data.data) {
          setTournaments(tournRes.data.data.items || tournRes.data.data || []);
        }
      } catch (err) {
        console.warn('Pairing init note:', err);
      } finally {
        setLoading(false);
      }
    }
    initPairing();
  }, []);

  // Instant pairing via Socket.IO + Polling fallback
  useEffect(() => {
    if (!pairingCode || isPaired) return;

    const onTvPaired = (data) => {
      if (data?.pairingCode === pairingCode || data?.displayUuid === pairingUuid) {
        setIsPaired(true);
        const target = data.displayUuid || pairingUuid;
        router.push(`/tv/${target}`);
      }
    };

    socket.on('signage:tvPaired', onTvPaired);

    const pollTimer = setInterval(async () => {
      try {
        const res = await axios.get(`/api/tv/pair/check/${pairingCode}`);
        if (res.data.success && res.data.data?.isPaired) {
          setIsPaired(true);
          const target = res.data.data.displayUuid || pairingUuid;
          router.push(`/tv/${target}`);
        }
      } catch (err) {
        // Still pending
      }
    }, 3000);

    return () => {
      socket.off('signage:tvPaired', onTvPaired);
      clearInterval(pollTimer);
    };
  }, [pairingCode, isPaired, pairingUuid, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ maxWidth: 880, width: '100%', textAlign: 'center' }}>
        {/* Header Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 12px 30px rgba(16, 185, 129, 0.3)'
          }}
        >
          <Tv size={36} color="#fff" />
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 950, margin: 0, letterSpacing: '-0.5px' }}>
          TurfSpot Smart TV Mode
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 'clamp(1rem, 1.4vw, 1.15rem)', marginTop: '0.5rem', marginBottom: '2.5rem' }}>
          Full-screen live scoreboard, multi-match symmetrical layouts, scene rotation, and stadium signage.
        </p>

        {/* Pairing Code Card */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            border: '2px solid rgba(16, 185, 129, 0.3)',
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            marginBottom: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981' }}>
            Smart TV Quick Pairing
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.5rem 0 1rem' }}>
            Pair this TV Screen with your Venue or Tournament
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: '8px',
              fontSize: 'clamp(2.5rem, 6vw, 4.2rem)',
              fontWeight: 950,
              color: '#34d399',
              background: '#0f172a',
              border: '2px solid #10b981',
              padding: '0.75rem 2rem',
              borderRadius: 16,
              margin: '0.75rem 0 1.25rem',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {loading ? <Loader2 size={36} className="spin" /> : pairingCode || 'CONNECT'}
          </div>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 auto 1.5rem', maxWidth: 540, lineHeight: 1.6 }}>
            On your phone, laptop, or administrator dashboard, go to <strong>TV Displays</strong> and enter the 6-character code above to pair this television instantly.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/tv/tv_arena_main_01"
              className="btn btn-primary"
              style={{
                background: '#10b981',
                borderColor: '#10b981',
                padding: '0.75rem 1.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Play size={18} /> Launch Default TV Display
            </Link>
          </div>
        </div>

        {/* Available Tournaments TV Quick-Links */}
        {tournaments.length > 0 && (
          <div style={{ textAlign: 'left', marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
              Or Broadcast a Specific Tournament:
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {tournaments.slice(0, 6).map(t => (
                <Link
                  key={t.id}
                  href={`/tv/${t.uuid || t.id}`}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 12,
                    padding: '1rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                  className="hover-card"
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 2 }}>Launch TV Mode →</div>
                  </div>
                  <Monitor size={18} color="#10b981" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TV Mode Keyboard Controls Guide */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.8rem' }}>
          <strong>Smart TV Hotkeys:</strong> Press <code>F</code> for Fullscreen • <code>Space</code> to Pause Rotation • <code>Arrow Keys</code> to Change Scenes • <code>T</code> to Toggle Theme
        </div>
      </div>
    </div>
  );
}
