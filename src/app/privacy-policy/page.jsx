'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Clock, Calendar, CheckCircle, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPolicy() {
      try {
        setLoading(true);
        const res = await axios.get('/api/privacy-policy/published');
        if (res.data.success && res.data.data) {
          setPolicy(res.data.data);
        } else {
          setError('No published privacy policy available at this time.');
        }
      } catch (err) {
        console.error('Failed to load privacy policy:', err);
        setError('Unable to load official privacy policy. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    }
    loadPolicy();
  }, []);

  return (
    <div className="container" style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3.5rem) 1.25rem' }}>
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.85rem'
          }}
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: 'clamp(1.5rem, 3vw, 2.5rem)',
          borderRadius: 16,
          marginBottom: '2rem',
          border: '1px solid var(--border-glow)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--accent-primary)'
              }}
            >
              Official Legal &amp; Transparency Document
            </span>
            <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', margin: 0, fontWeight: 900, color: 'var(--text-heading)' }}>
              {policy?.title || 'TurfSpot Official Privacy Policy'}
            </h1>
          </div>
        </div>

        {policy && (
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} color="var(--accent-primary)" />
              <strong>Effective Date:</strong> {new Date(policy.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--accent-secondary)" />
              <strong>Version:</strong> v{policy.version}.0 (Official)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} color="#10b981" />
              Verified for Google Play Compliance
            </span>
          </div>
        )}
      </div>

      {/* Content Body */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 1rem' }} />
          <p>Loading official privacy policy...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          <p>{error}</p>
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            padding: 'clamp(1.5rem, 3vw, 2.5rem)',
            borderRadius: 16,
            lineHeight: '1.8',
            fontSize: '0.98rem',
            color: 'var(--text-main)'
          }}
        >
          {policy.content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (trimmed.startsWith('# ')) {
              return <h1 key={idx} style={{ fontSize: '1.8rem', fontWeight: 900, margin: '2rem 0 1rem', color: 'var(--text-heading)' }}>{trimmed.replace('# ', '')}</h1>;
            }
            if (trimmed.startsWith('## ')) {
              return <h2 key={idx} style={{ fontSize: '1.4rem', fontWeight: 800, margin: '1.75rem 0 0.85rem', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>{trimmed.replace('## ', '')}</h2>;
            }
            if (trimmed.startsWith('### ')) {
              return <h3 key={idx} style={{ fontSize: '1.15rem', fontWeight: 700, margin: '1.5rem 0 0.75rem', color: 'var(--accent-primary)' }}>{trimmed.replace('### ', '')}</h3>;
            }
            if (trimmed.startsWith('---')) {
              return <hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.75rem 0' }} />;
            }
            if (trimmed.startsWith('- ')) {
              const items = trimmed.split('\n- ');
              return (
                <ul key={idx} style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                  {items.map((item, i) => (
                    <li key={i} style={{ marginBottom: '0.4rem' }}>
                      {item.replace(/^- /, '')}
                    </li>
                  ))}
                </ul>
              );
            }
            return <p key={idx} style={{ marginBottom: '1.1rem' }}>{trimmed}</p>;
          })}

          {/* Quick Access to Account Deletion */}
          <div
            style={{
              marginTop: '2.5rem',
              padding: '1.25rem',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#f87171', fontWeight: 700 }}>
                Looking to delete your account or personal data?
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                You can initiate account deactivation &amp; data deletion directly through our Google Play compliant portal.
              </p>
            </div>
            <Link
              href="/delete-account"
              className="btn btn-outline btn-sm"
              style={{ borderColor: '#f87171', color: '#f87171' }}
            >
              Account Deletion Portal →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
