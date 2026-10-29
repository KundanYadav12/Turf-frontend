'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import axios from 'axios';
import confetti from 'canvas-confetti';
import {
  Shield, Users, Trophy, MapPin, User, CheckCircle2,
  AlertCircle, ArrowRight, LogIn, UserPlus, Sparkles,
  ArrowLeft, Share2, Copy, Check
} from 'lucide-react';

export default function TeamJoinPage({ code }) {
  const router = useRouter();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch team invite preview
  const fetchInviteInfo = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`/api/teams/invite/${code}`, config);
      if (res.data.success && res.data.data) {
        setTeam(res.data.data);
        if (res.data.data.isMember) {
          setAlreadyMember(true);
        }
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'The invite link is invalid, expired, or has been revoked.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [code, token]);

  useEffect(() => {
    fetchInviteInfo();
  }, [fetchInviteInfo]);

  // Handle Join Team
  const handleJoinTeam = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/teams/join/${code}`);
      return;
    }

    setJoining(true);
    setErrorMsg('');

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(`/api/teams/join/${code}`, {}, config);

      if (res.data.success) {
        if (res.data.alreadyMember) {
          setAlreadyMember(true);
        } else {
          setJoinSuccess(true);
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch (e) {
            // ignore confetti error if canvas not ready
          }
        }
        // Refresh invite info
        fetchInviteInfo();
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to join team. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
          <p style={{ fontSize: '0.95rem' }}>Loading squad invite details…</p>
        </div>
      </div>
    );
  }

  // Error / Invalid Link State
  if (errorMsg && !team) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div
          className="glass-panel"
          style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(239, 68, 68, 0.1))'
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#ef4444'
            }}
          >
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem' }}>
            Invite Link Unavailable
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.6' }}>
            {errorMsg}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/teams" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowLeft size={16} /> Explore Teams
            </Link>
            <Link href="/" className="btn btn-primary">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '24px',
          padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 58, 138, 0.35))',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Glow Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)'
          }}
        />

        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            href="/teams"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={15} /> All Teams
          </Link>
        </div>

        {/* Header Invitation Tag */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '1rem'
            }}
          >
            <Sparkles size={14} /> Team Invitation
          </div>

          {/* Team Logo */}
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: '24px',
              background: team.logoUrl
                ? `url(${team.logoUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#fff',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              margin: '0 auto 1rem auto'
            }}
          >
            {!team.logoUrl && (team.name ? team.name.charAt(0).toUpperCase() : 'T')}
          </div>

          <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
            {team.name}
          </h1>

          {/* Sport & Division badges */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <span className="badge badge-info">{team.sport?.name || 'Sports'}</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
              {team.division || 'Open Division'}
            </span>
            <span className="badge badge-success">{team.status}</span>
          </div>

          {team.description && (
            <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.6', margin: '0.75rem 0 0 0' }}>
              {team.description}
            </p>
          )}
        </div>

        {/* Team Details Grid */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '1rem'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Squad Size
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              <Users size={16} /> {team.memberCount || 0} Players
            </div>
          </div>

          {team.captain?.name && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Captain
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <User size={15} /> {team.captain.name}
              </div>
            </div>
          )}

          {team.homeLocation && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                Home Venue
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <MapPin size={15} color="#ef4444" /> {team.homeLocation}
              </div>
            </div>
          )}
        </div>

        {/* Notification / Success / Already Member states */}
        {joinSuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: '#34d399'
            }}
          >
            <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
              Welcome to {team.name}!
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#34d399', margin: '0 0 1rem 0' }}>
              You have successfully joined the team. This team is now saved in your <strong>My Teams</strong> list.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link href={`/teams/${team.id}`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                View Squad Roster <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {alreadyMember && !joinSuccess && (
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '14px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              color: '#38bdf8'
            }}
          >
            <CheckCircle2 size={26} style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
              You are already in this squad!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#93c5fd', margin: '0 0 1rem 0' }}>
              You are already an active player or owner of {team.name}.
            </p>
            <Link href={`/teams/${team.id}`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              Open Team Page <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!joinSuccess && !alreadyMember && (
          <div>
            {!isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px dashed rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    textAlign: 'center',
                    color: '#fbbf24',
                    fontSize: '0.85rem'
                  }}
                >
                  Sign in or create an account to join this squad.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Link
                    href={`/login?redirect=/teams/join/${code}`}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <LogIn size={16} /> Sign In
                  </Link>

                  <Link
                    href={`/register?redirect=/teams/join/${code}`}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <UserPlus size={16} /> Register
                  </Link>
                </div>
              </div>
            ) : (
              <button
                id="join-team-btn"
                onClick={handleJoinTeam}
                disabled={joining}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                {joining ? (
                  <>Joining Squad…</>
                ) : (
                  <>
                    <Shield size={18} /> Join {team.name}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Footer Share / Copy Link utility */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}
        >
          <span>Share link with teammates:</span>
          <button
            onClick={handleCopyLink}
            style={{
              background: 'transparent',
              border: 'none',
              color: copied ? '#34d399' : '#38bdf8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
              fontSize: '0.8rem'
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied Link!' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
