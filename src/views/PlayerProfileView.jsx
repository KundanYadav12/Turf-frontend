'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  User, Trophy, Award, Shield, Calendar, ArrowLeft,
  Activity, Flame, CheckCircle, MapPin, Edit3, Lock,
  Phone, Mail, AlertCircle, X, ExternalLink, ChevronRight,
  Camera, AtSign, Loader2, Upload
} from 'lucide-react';
import { compressAndOptimizeImage } from '../lib/imageOptimizer';

export default function PlayerProfileView({ player }) {
  const [activeCareerTab, setActiveCareerTab] = useState(
    player.primarySportSlug || 'cricket'
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: player.fullName || '',
    city: player.city || '',
    state: player.state || '',
    country: player.country || 'India',
    primarySportSlug: player.primarySportSlug || 'cricket',
    primaryPosition: player.primaryPosition || 'All-Rounder',
    jerseyNumber: player.jerseyNumber || '',
    battingStyle: player.battingStyle || 'Right-hand bat',
    bowlingStyle: player.bowlingStyle || 'Right-arm medium',
    preferredHandFoot: player.preferredHandFoot || 'Right',
    experienceLevel: player.experienceLevel || 'Club',
    skillCategory: player.skillCategory || 'Amateur',
    emergencyContactName: player.contact?.emergencyContactName || '',
    emergencyContactPhone: player.contact?.emergencyContactPhone || '',
    address: player.contact?.address || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const careerStats = player.careerStats || {};
  const cricketStats = careerStats.cricket || {};
  const footballStats = careerStats.football || {};
  const badmintonStats = careerStats.badminton || {};
  const pickleballStats = careerStats.pickleball || {};
  const matchHistory = player.matchHistory || [];

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('turf_token') || localStorage.getItem('token')) : null;
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: 'success', text: 'Profile updated successfully! Refreshing...' });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setSaveMessage({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Network error updating profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 2.5vw, 2rem) clamp(0.75rem, 2vw, 1.5rem)', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <Link
          href="/tournaments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-muted, #94a3b8)',
            fontSize: '0.88rem',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Back to Tournaments &amp; Community
        </Link>

        {player.canEdit && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.95rem',
              fontSize: '0.84rem',
              borderRadius: '8px'
            }}
          >
            <Edit3 size={14} /> Edit Athlete Profile
          </button>
        )}
      </div>

      {/* Hero Banner Header */}
      <div
        className="glass-panel"
        style={{
          padding: 'clamp(1.5rem, 3vw, 2.5rem)',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.35))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                background: player.profilePhoto
                  ? `url(${player.profilePhoto}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #10b981, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#fff',
                border: '3px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}
            >
              {!player.profilePhoto && (player.fullName?.charAt(0)?.toUpperCase() || 'P')}
            </div>

            {player.canEdit && (
              <label
                title="Update Profile Photo"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff'
                }}
              >
                <Camera size={15} />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const optimized = await compressAndOptimizeImage(file, 512, 512, 0.85);
                      const formData = new FormData();
                      formData.append('photo', optimized.file);
                      const token = typeof window !== 'undefined' ? (localStorage.getItem('turf_token') || localStorage.getItem('token')) : null;
                      const res = await fetch('/api/users/profile-photo', {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.location.reload();
                      }
                    } catch (err) {
                      alert('Failed to update photo: ' + err.message);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Player Info */}
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle size={12} /> Verified Athlete
              </span>
              {player.jerseyNumber && (
                <span className="badge badge-info" style={{ fontWeight: 800 }}>
                  #{player.jerseyNumber}
                </span>
              )}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} /> Active since {player.memberSince ? new Date(player.memberSince).getFullYear() : '2025'}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#fff' }}>
              {player.fullName}
            </h1>

            {player.username && (
              <div style={{ fontSize: '1rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700, marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AtSign size={15} />
                <span>{player.username}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={15} color="#38bdf8" /> {player.city ? `${player.city}, ${player.country}` : 'India'}
              </span>
              <span>•</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>{player.primaryPosition || 'All-Rounder'}</span>
              <span>•</span>
              <span style={{ color: '#94a3b8' }}>{player.experienceLevel || 'Club'} Tier</span>
              {player.age && (
                <>
                  <span>•</span>
                  <span style={{ color: '#94a3b8' }}>Age: {player.age} yrs</span>
                </>
              )}
            </div>

            {/* Quick Metrics Strip */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.85rem', borderRadius: '10px' }}>
                <Activity size={16} color="#34d399" />
                <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                  <strong>{matchHistory.length}</strong> Matches Recorded
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.85rem', borderRadius: '10px' }}>
                <Shield size={16} color="#60a5fa" />
                <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                  <strong>{player.teams?.length || 0}</strong> Registered Teams
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.85rem', borderRadius: '10px' }}>
                <Trophy size={16} color="#fbbf24" />
                <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                  <strong>{player.awardsWon?.length || 0}</strong> Accolades Won
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy-Protected Contact Banner (Self or Admin only) */}
        {player.contact?.phone || player.contact?.email ? (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.85rem 1.25rem',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', color: '#cbd5e1' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontWeight: 700 }}>
                <Lock size={14} /> Private Contact (Authorized View):
              </span>
              {player.contact.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={13} color="#94a3b8" /> {player.contact.phone}
                </span>
              )}
              {player.contact.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={13} color="#94a3b8" /> {player.contact.email}
                </span>
              )}
              {player.contact.emergencyContactName && (
                <span style={{ color: '#fbbf24' }}>
                  Emergency: {player.contact.emergencyContactName} ({player.contact.emergencyContactPhone || 'N/A'})
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Protected by RBAC data isolation</span>
          </div>
        ) : (
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            <Lock size={12} /> Contact details are protected and private to spectators.
          </div>
        )}
      </div>

      {/* Main Grid: Career Analytics & Sidebar */}
      <div className="player-profile-layout">
        {/* Left Column */}
        <div className="player-profile-main">
          {/* Career Statistics Section */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={20} color="#f97316" /> Authoritative Career Statistics
              </h2>

              {/* Sport Tabs */}
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  onClick={() => setActiveCareerTab('cricket')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeCareerTab === 'cricket' ? '#10b981' : 'transparent',
                    color: activeCareerTab === 'cricket' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🏏 Cricket
                </button>
                <button
                  onClick={() => setActiveCareerTab('football')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeCareerTab === 'football' ? '#10b981' : 'transparent',
                    color: activeCareerTab === 'football' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚽ Football
                </button>
                <button
                  onClick={() => setActiveCareerTab('badminton')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeCareerTab === 'badminton' ? '#10b981' : 'transparent',
                    color: activeCareerTab === 'badminton' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🏸 Badminton
                </button>
                <button
                  onClick={() => setActiveCareerTab('pickleball')}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeCareerTab === 'pickleball' ? '#10b981' : 'transparent',
                    color: activeCareerTab === 'pickleball' ? '#fff' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  🏓 Pickleball
                </button>
              </div>
            </div>

            {/* CRICKET STATS PANEL */}
            {activeCareerTab === 'cricket' && (
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Cricket Career Overview</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Style: {player.battingStyle || 'Right-hand bat'} • Bowling: {player.bowlingStyle || 'Right-arm medium'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Matches</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{cricketStats.matchesPlayed || 0}</div>
                  </div>
                </div>

                {/* Batting Breakdown */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                    Batting Performance (Strike Rate = Runs/Balls × 100)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Innings</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{cricketStats.batting?.innings || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Runs</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{cricketStats.batting?.runs || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Highest</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{cricketStats.batting?.highestScore || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Batting Avg</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{cricketStats.batting?.battingAverage || '0.00'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Strike Rate</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>{cricketStats.batting?.strikeRate || '0.00'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>4s / 6s</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                        {cricketStats.batting?.fours || 0} / {cricketStats.batting?.sixes || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bowling Breakdown */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                    Bowling Performance (Economy = Runs/Legal Overs)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Overs</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>{cricketStats.bowling?.oversBowled || '0.0'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Wickets</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>{cricketStats.bowling?.wickets || 0}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Economy</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{cricketStats.bowling?.economy || '0.00'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Bowling Avg</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{cricketStats.bowling?.bowlingAverage || '0.00'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Best Bowling</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>{cricketStats.bowling?.bestBowling || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FOOTBALL STATS PANEL */}
            {activeCareerTab === 'football' && (
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Football Career Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Matches</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{footballStats.matchesPlayed || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Goals</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{footballStats.goals || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Assists</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{footballStats.assists || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Yellow Cards</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{footballStats.yellowCards || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Red Cards</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{footballStats.redCards || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* RACKET SPORTS (BADMINTON / PICKLEBALL) */}
            {(activeCareerTab === 'badminton' || activeCareerTab === 'pickleball') && (
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>
                  {activeCareerTab} Match Record
                </h3>
                {(() => {
                  const stat = activeCareerTab === 'badminton' ? badmintonStats : pickleballStats;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Matches</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{stat.matchesPlayed || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Won</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{stat.won || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lost</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{stat.lost || 0}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Win Rate</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{stat.winPercentage || '0.0%'}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Chronological Match-by-Match History */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#38bdf8" /> Chronological Match-by-Match History
            </h2>

            {matchHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {matchHistory.map((m, idx) => (
                  <div
                    key={m.matchId || idx}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'border-color 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: '1 1 280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                          {m.sportName}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {m.matchDate ? new Date(m.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Match'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>•</span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.tournamentName}</span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: '0.35rem' }}>
                        {m.teamName} vs {m.opponentName}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>
                        Result: {m.resultSummary}
                      </div>

                      {/* Performance Details */}
                      {m.performance && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.84rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                          {m.performance.batting && <span>🏏 <strong>Bat:</strong> {m.performance.batting} </span>}
                          {m.performance.bowling && <span>| 🎯 <strong>Bowl:</strong> {m.performance.bowling} </span>}
                          {m.performance.goals !== undefined && (
                            <span>⚽ {m.performance.goals} Goals, {m.performance.assists} Assists</span>
                          )}
                          {m.performance.scoreSummary && (
                            <span>Score: {m.performance.scoreSummary}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Link
                        href={`/matches/${m.matchId}`}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.5rem 0.95rem',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        Scorecard <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderRadius: '14px' }}>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>
                  No match-by-match performances logged yet. Matches will automatically populate upon completion of tournament fixtures.
                </p>
              </div>
            )}
          </div>

          {/* Tournament Honours & Accolades */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="#fbbf24" /> Tournament Honours &amp; Accolades
            </h2>

            {player.awardsWon && player.awardsWon.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {player.awardsWon.map((awd) => (
                  <div
                    key={awd.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.7))'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trophy size={18} color="#fbbf24" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>{awd.award_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{awd.tournament_name}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Record</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399' }}>{awd.stat_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderRadius: '14px' }}>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.88rem' }}>No individual awards logged yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teams & Rosters */}
        <div className="player-profile-sidebar">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="#60a5fa" /> Registered Teams &amp; Squads
          </h2>

          {player.teams && player.teams.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {player.teams.map((tm) => (
                <Link
                  key={tm.id}
                  href={`/teams/${tm.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="glass-panel"
                    style={{
                      padding: '1.15rem',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      transition: 'transform 0.15s, border-color 0.15s',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '10px',
                          background: tm.logoUrl ? `url(${tm.logoUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          flexShrink: 0
                        }}
                      >
                        {!tm.logoUrl && (tm.name ? tm.name.charAt(0).toUpperCase() : 'T')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.96rem' }}>{tm.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {tm.sportName} • {tm.position || 'Squad'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                        {tm.isCaptain ? 'CAPTAIN' : (tm.role || 'MEMBER')}
                      </span>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderRadius: '14px' }}>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.88rem' }}>No team affiliations recorded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#34d399" /> Edit Athlete Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {saveMessage && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                background: saveMessage.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                color: saveMessage.type === 'success' ? '#34d399' : '#f87171',
                border: `1px solid ${saveMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
              }}>
                {saveMessage.text}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>City</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>State</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.state}
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Primary Sport</label>
                  <select
                    className="input-field"
                    value={editFormData.primarySportSlug}
                    onChange={(e) => setEditFormData({ ...editFormData, primarySportSlug: e.target.value })}
                  >
                    <option value="cricket">Cricket</option>
                    <option value="football">Football</option>
                    <option value="badminton">Badminton</option>
                    <option value="pickleball">Pickleball</option>
                    <option value="tennis">Tennis</option>
                    <option value="basketball">Basketball</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Playing Position</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.primaryPosition}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryPosition: e.target.value })}
                    placeholder="e.g. Batsman, Striker, Defender"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Batting Style</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.battingStyle}
                    onChange={(e) => setEditFormData({ ...editFormData, battingStyle: e.target.value })}
                    placeholder="Right-hand bat"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Bowling Style</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editFormData.bowlingStyle}
                    onChange={(e) => setEditFormData({ ...editFormData, bowlingStyle: e.target.value })}
                    placeholder="Right-arm medium"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Jersey Number</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editFormData.jerseyNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, jerseyNumber: e.target.value })}
                    placeholder="e.g. 7 or 18"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Experience Level</label>
                  <select
                    className="input-field"
                    value={editFormData.experienceLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, experienceLevel: e.target.value })}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Club">Club</option>
                    <option value="Semi-Pro">Semi-Pro</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>
              </div>

              {/* Private Emergency Contact Details */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Lock size={12} /> Emergency Contact (Private):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Contact Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editFormData.emergencyContactName}
                      onChange={(e) => setEditFormData({ ...editFormData, emergencyContactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Phone</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editFormData.emergencyContactPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
