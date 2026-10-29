'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  X, Trophy, Calendar, MapPin, Users, DollarSign, Upload,
  AlertCircle, CheckCircle, Shield, Gavel, FileText, ChevronRight
} from 'lucide-react';

const CreateTournamentModal = ({ isOpen = true, onClose, onTournamentCreated, onSuccess }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    sportId: 1, // Default Cricket
    format: 'LEAGUE',
    venueId: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    maxTeams: 16,
    entryFee: 0,
    description: '',
    rules: '',
    bannerUrl: '',
    hasAuction: false,
    status: 'PUBLISHED',
    // Pickleball configuration
    matchFormat: 'DOUBLES',
    scoringMode: 'RALLY',
    rotationRule: 'OFFICIAL',
    targetScore: 15,
    winByTwo: true,
    maxScore: '',
    rosterSize: 12,
    groupsCount: 2
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch sports and venues on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchOptions = async () => {
      setLoadingInitial(true);
      setError('');
      try {
        const [sportsRes, venuesRes] = await Promise.all([
          axios.get('/api/sports'),
          axios.get('/api/venues')
        ]);

        if (sportsRes.data && (sportsRes.data.data || Array.isArray(sportsRes.data))) {
          const items = sportsRes.data.data || sportsRes.data;
          setSports(items);
          if (items.length > 0 && !formData.sportId) {
            setFormData((prev) => ({ ...prev, sportId: items[0].id }));
          }
        }

        if (venuesRes.data && (venuesRes.data.data || Array.isArray(venuesRes.data))) {
          const items = venuesRes.data.data || venuesRes.data;
          setVenues(items);
        }
      } catch (err) {
        console.warn('Failed to load sports/venues options:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedSport = sports.find((s) => String(s.id) === String(formData.sportId));
  const isPickleball = selectedSport?.slug === 'pickleball' || selectedSport?.name?.toLowerCase().includes('pickleball') || String(formData.sportId) === '6';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  const validate = () => {
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      return 'Tournament name must be at least 3 characters long.';
    }
    if (!formData.startDate) {
      return 'Tournament start date is required.';
    }
    if (!formData.endDate) {
      return 'Tournament end date is required.';
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      return 'Tournament end date cannot be earlier than start date.';
    }

    if (formData.registrationDeadline) {
      const regDeadline = new Date(formData.registrationDeadline);
      if (regDeadline > start) {
        return 'Registration deadline cannot be after tournament start date.';
      }
    }

    const maxT = parseInt(formData.maxTeams, 10);
    if (isNaN(maxT) || maxT < 2 || maxT > 64) {
      return 'Maximum teams limit must be between 2 and 64.';
    }

    const fee = parseFloat(formData.entryFee);
    if (isNaN(fee) || fee < 0) {
      return 'Entry fee must be a valid non-negative amount.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('sportId', formData.sportId);
      data.append('format', formData.format);
      if (formData.venueId) data.append('venueId', formData.venueId);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      data.append('registrationDeadline', formData.registrationDeadline || formData.startDate);
      data.append('maxTeams', formData.maxTeams);
      data.append('entryFee', formData.entryFee);
      if (formData.description) data.append('description', formData.description.trim());
      if (formData.rules) data.append('rules', formData.rules.trim());
      if (formData.bannerUrl) data.append('bannerUrl', formData.bannerUrl.trim());
      data.append('hasAuction', formData.hasAuction ? 'true' : 'false');
      data.append('status', formData.status);

      if (isPickleball) {
        data.append('matchFormat', formData.matchFormat);
        data.append('scoringMode', formData.scoringMode || 'RALLY');
        data.append('rotationRule', formData.rotationRule || 'OFFICIAL');
        data.append('targetScore', formData.targetScore);
        data.append('winByTwo', formData.winByTwo ? 'true' : 'false');
        if (formData.maxScore) data.append('maxScore', formData.maxScore);
        data.append('rosterSize', formData.rosterSize);
        data.append('groupsCount', formData.groupsCount);
      }

      if (bannerFile) {
        data.append('banner', bannerFile);
      }

      const token = typeof window !== 'undefined' ? (localStorage.getItem('turf_token') || localStorage.getItem('token')) : null;
      const res = await axios.post('/api/tournaments', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.data.success) {
        setSuccess('Tournament created successfully!');
        const created = res.data.data;
        if (onTournamentCreated) onTournamentCreated(created);
        if (onSuccess) onSuccess(created);

        setTimeout(() => {
          if (onClose) onClose();
          if (typeof window !== 'undefined') {
            window.location.href = `/tournaments/${created.id}`;
          } else {
            navigate(`/tournaments/${created.id}`);
          }
        }, 800);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create tournament. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    padding: '0.65rem 0.85rem',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    paddingRight: '2.5rem'
  };

  const optionStyle = {
    background: 'var(--bg-modal, var(--bg-card))',
    color: 'var(--text-main)',
    padding: '8px 12px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem'
  };

  const sectionTitleStyle = {
    fontSize: '0.95rem',
    fontWeight: 700,
    margin: '0 0 0.85rem 0',
    color: 'var(--text-heading)'
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-overlay, rgba(5, 8, 15, 0.85))',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-modal, var(--bg-card))',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-elevated)',
        color: 'var(--text-main)',
        padding: '1.75rem'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          paddingBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '8px',
              borderRadius: '10px',
              color: 'var(--accent-primary, #10b981)'
            }}>
              <Trophy size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #ffffff)' }}>
                Create New Tournament
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Configure tournament format, venue, scheduling, team limits and bidding rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.88rem',
            fontWeight: 600
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.88rem',
            fontWeight: 700
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: BASIC INFORMATION */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={sectionTitleStyle}>
              1. Basic Tournament Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Tournament Name *
                </label>
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Mumbai Super Cricket Cup 2026"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Sport Type *
                </label>
                <select
                  name="sportId"
                  value={formData.sportId}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  {sports.length > 0 ? (
                    sports.map((s) => (
                      <option key={s.id} value={s.id} style={optionStyle}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="1" style={optionStyle}>Cricket</option>
                      <option value="2" style={optionStyle}>Football</option>
                      <option value="3" style={optionStyle}>Badminton</option>
                      <option value="4" style={optionStyle}>Tennis</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Tournament Format *
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="LEAGUE" style={optionStyle}>League / Round-Robin</option>
                  <option value="KNOCKOUT" style={optionStyle}>Knockout / Single Elimination</option>
                  <option value="LEAGUE_KNOCKOUT" style={optionStyle}>Group Stage + Knockout</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Description (Optional)
              </label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief summary of the tournament, eligibility criteria, and awards..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* SECTION 1.5: PICKLEBALL CONFIGURATION (When Pickleball is selected) */}
          {isPickleball && (
            <div style={{
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, rgba(6,78,59,0.25), rgba(15,23,42,0.9))',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(16,185,129,0.4)',
              boxShadow: '0 4px 20px rgba(16,185,129,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ background: '#10b981', color: '#fff', borderRadius: '6px', padding: '4px' }}>
                  <Trophy size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#34d399' }}>
                    Pickleball Tournament Rules & Format
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1' }}>
                    Configure singles/doubles on-court format, target points, squad roster size, and groups
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={labelStyle}>
                    Match Format *
                  </label>
                  <select
                    name="matchFormat"
                    value={formData.matchFormat}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="DOUBLES" style={optionStyle}>Doubles (2 Players on Court)</option>
                    <option value="SINGLES" style={optionStyle}>Singles (1 Player on Court)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Scoring Format *
                  </label>
                  <select
                    name="scoringMode"
                    value={formData.scoringMode}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="RALLY" style={optionStyle}>Rally Scoring — 15 Pts (Default)</option>
                    <option value="SIDE_OUT" style={optionStyle}>Traditional Side-Out</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Playing / Rotation Rule *
                  </label>
                  <select
                    name="rotationRule"
                    value={formData.rotationRule || 'OFFICIAL'}
                    onChange={handleChange}
                    style={selectStyle}
                  >
                    <option value="OFFICIAL" style={optionStyle}>Official USA Pickleball (Default)</option>
                    <option value="BADMINTON" style={optionStyle}>Badminton Style (BWF Doubles Rotation)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    Target Score per Match *
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="targetScore"
                    value={formData.targetScore}
                    onChange={handleChange}
                    placeholder="15"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Roster Squad Size (Registered) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="rosterSize"
                    value={formData.rosterSize}
                    onChange={handleChange}
                    placeholder="12"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    Number of Groups *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    name="groupsCount"
                    value={formData.groupsCount}
                    onChange={handleChange}
                    placeholder="2"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main, #f8fafc)' }}>
                  <input
                    type="checkbox"
                    name="winByTwo"
                    checked={formData.winByTwo}
                    onChange={handleChange}
                    style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                  />
                  <span>Require Win By Two points (e.g. 15-13, 16-14)</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>Max Score Cap (Optional):</span>
                  <input
                    type="number"
                    name="maxScore"
                    value={formData.maxScore}
                    onChange={handleChange}
                    placeholder="e.g. 21"
                    style={{
                      ...inputStyle,
                      width: '80px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: LOCATION & SCHEDULING */}
          <div style={{
            marginBottom: '1.5rem',
            background: 'var(--bg-elevated, rgba(16, 25, 41, 0.6))',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color, rgba(255,255,255,0.08))'
          }}>
            <h3 style={sectionTitleStyle}>
              2. Venue & Scheduling
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Host Turf / Venue
                </label>
                <select
                  name="venueId"
                  value={formData.venueId}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="" style={optionStyle}>-- None / Multi-Venue / City Wide --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id} style={optionStyle}>
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Registration Deadline
                </label>
                <input
                  type="date"
                  name="registrationDeadline"
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                  Defaults to start date if blank
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: PARTICIPATION & SETTINGS */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={sectionTitleStyle}>
              3. Participation & Auction Settings
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Maximum Teams *
                </label>
                <input
                  type="number"
                  required
                  min="2"
                  max="64"
                  name="maxTeams"
                  value={formData.maxTeams}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Entry Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  name="entryFee"
                  value={formData.entryFee}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Initial Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={selectStyle}
                >
                  <option value="PUBLISHED" style={optionStyle}>Published (Visible in Hub)</option>
                  <option value="DRAFT" style={optionStyle}>Draft (Unlisted)</option>
                </select>
              </div>
            </div>

            {/* Auction Switcher */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--slot-available-bg, rgba(16, 185, 129, 0.08))',
              border: '1px solid var(--slot-available-border, rgba(16, 185, 129, 0.25))',
              borderRadius: '10px',
              padding: '0.85rem 1.25rem',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gavel size={20} color="var(--accent-primary, #10b981)" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-heading, #ffffff)' }}>
                    Enable Cricket Player Auction / Bidding
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                    Add auction module with team wallets, compulsory squad size & mandatory reserve rules
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                name="hasAuction"
                checked={formData.hasAuction}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary, #10b981)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* SECTION 4: BANNER IMAGE */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={sectionTitleStyle}>
              4. Banner Image (Optional)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                  Upload File:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted, #94a3b8)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.35rem' }}>
                  Or Banner Image URL:
                </label>
                <input
                  type="url"
                  name="bannerUrl"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.bannerUrl}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            paddingTop: '1.25rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                color: 'var(--text-muted, #94a3b8)',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent-primary, #10b981)',
                border: 'none',
                color: 'var(--text-on-accent, #022c22)',
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Trophy size={16} />
              {submitting ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
