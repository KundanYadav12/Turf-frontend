'use client';
import React, { useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import {
  Trash2, ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft,
  Lock, Mail, Loader2, Info, FileText
} from 'lucide-react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [identifier, setIdentifier] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success: bool, message: string, scheduledDate?: string }
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmedCheck) {
      setErrorMsg('Please confirm that you understand account deactivation and data retention terms.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      let res;
      if (token) {
        // Authenticated deletion request
        res = await axios.post('/api/users/me/delete-request', {
          reason,
          password: password || undefined
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Public web verification deletion request
        res = await axios.post('/api/account/public-deletion-request', {
          identifier,
          password,
          reason
        });
      }

      if (res.data.success) {
        setResult({
          success: true,
          message: res.data.message,
          scheduledDate: res.data.data?.scheduledPermanentDeletionAt
        });
        // Clear auth session if logged in
        if (token) {
          dispatch(logout());
        }
      } else {
        setErrorMsg(res.data.message || 'Failed to submit account deletion request.');
      }
    } catch (err) {
      console.error('Account deletion error:', err);
      setErrorMsg(
        err?.response?.data?.message ||
        'Unable to process deletion request. Please check your credentials or contact support@turfspot.com.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 850, margin: '0 auto', padding: 'clamp(1.5rem, 4vw, 3.5rem) 1.25rem' }}>
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
          padding: 'clamp(1.5rem, 3vw, 2.2rem)',
          borderRadius: 16,
          marginBottom: '2rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#ef4444',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={24} />
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#ef4444'
              }}
            >
              Google Play Store Account &amp; Data Deletion
            </span>
            <h1 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', margin: 0, fontWeight: 900, color: 'var(--text-heading)' }}>
              Request Account &amp; Data Deletion
            </h1>
          </div>
        </div>
        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
          In accordance with Google Play Store policies and global privacy regulations, users can initiate permanent account deactivation and personal data deletion directly through this secure portal without needing to reinstall the mobile application.
        </p>
      </div>

      {result ? (
        /* Success State */
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: 16,
            textAlign: 'center',
            border: '1px solid var(--border-glow)'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.75rem' }}>
            Account Deletion Request Received
          </h2>
          <p style={{ color: 'var(--text-main)', maxWidth: 600, margin: '0 auto 1.5rem', lineHeight: '1.7' }}>
            {result.message}
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              margin: '0 auto 2rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ marginBottom: '0.4rem' }}>
              <strong>Status:</strong> <span style={{ color: '#f59e0b' }}>Deactivated (Pending Deletion)</span>
            </div>
            <div style={{ marginBottom: '0.4rem' }}>
              <strong>Active Sessions:</strong> Terminated immediately
            </div>
            {result.scheduledDate && (
              <div>
                <strong>Scheduled Permanent Deletion:</strong>{' '}
                {new Date(result.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>

          <Link href="/" className="btn btn-primary">
            Return to Homepage
          </Link>
        </div>
      ) : (
        /* Form & Information Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Data Transparency */}
          <div
            className="glass-panel"
            style={{
              padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              borderRadius: 16
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} color="var(--accent-primary)" /> What Happens Next?
            </h3>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.9rem', lineHeight: '1.6' }}>
              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>1. Immediate Account Deactivation</strong>
                Your account is marked as deleted. You will be immediately logged out of all active web and mobile app sessions, and login will be blocked.
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>2. Search &amp; Roster Removal</strong>
                Your profile is removed from active player search results, team registries, and upcoming fixture notifications.
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>3. 30-Day Retention Grace Period</strong>
                Your account is scheduled for permanent PII deletion after 30 days. If you submitted this request by mistake, contact support within this window.
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>4. Permanent PII Anonymization</strong>
                Personal identifiers (full name, phone, email, profile photo, address) are permanently purged or anonymized to &quot;Deleted User&quot;.
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>5. Tournament Standings Preservation</strong>
                To protect tournament fairness for teammates and opponents, historical scorecards, match statistics, and team standings remain intact without personal data.
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Read our full legal disclosures in our{' '}
              <Link href="/privacy-policy" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                Official Privacy Policy
              </Link>.
            </div>
          </div>

          {/* Right Column: Request Form */}
          <div
            className="glass-panel"
            style={{
              padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              borderRadius: 16
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#ef4444" /> Verify Account &amp; Confirm
            </h3>

            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  marginBottom: '1rem'
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!token && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                    Registered Email or Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. rohit_player or user@email.com"
                      className="input"
                      style={{ width: '100%', paddingLeft: '2.4rem' }}
                    />
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              )}

              {token && user && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Logged In User:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{user.fullName} (@{user.username})</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{user.email}</div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Account Password (for verification)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="input"
                    style={{ width: '100%', paddingLeft: '2.4rem' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'block' }}>
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you are leaving (e.g. no longer playing, privacy concerns)"
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Confirmation Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: '0.25rem'
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmedCheck}
                  onChange={(e) => setConfirmedCheck(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  I understand that this action deactivates my account immediately and schedules my personal data for permanent deletion after 30 days.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !confirmedCheck}
                className="btn btn-primary"
                style={{
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isSubmitting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                {isSubmitting ? 'Processing Request...' : 'Submit Deletion Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
