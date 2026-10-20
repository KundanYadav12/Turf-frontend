'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Lock,
  User,
  Phone,
  Mail,
  FileText,
  Upload,
  AlertTriangle,
  XCircle,
  Check
} from 'lucide-react';

// Verhoeff checksum algorithm for client-side Aadhaar validation
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

function validateVerhoeff(numStr) {
  if (!numStr || typeof numStr !== 'string') return false;
  const clean = numStr.replace(/\s+/g, '');
  if (!/^\d{12}$/.test(clean)) return false;

  let c = 0;
  const reversed = clean.split('').reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]];
  }
  return c === 0;
}

export default function TournamentRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [config, setConfig] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const [registeredTeams, setRegisteredTeams] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    age: '',
    playingHand: 'RIGHT',
    phone: '',
    email: '',
    address: '',
    aadhaar: '',
    preferredRole: '',
    preferredTeamId: '',
    jerseySize: 'M',
    customFields: {},
    consentAgreed: false
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');
  const [ageError, setAgeError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('turf_token') || localStorage.getItem('token');
  };

  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load configuration & existing registration
  const loadData = async () => {
    setLoading(true);
    setFormError('');
    try {
      const token = getAuthToken();
      setIsLoggedIn(Boolean(token));

      // 1. Load config
      const cfgRes = await axios.get(`/api/tournaments/${tournamentId}/registration-config`);
      if (cfgRes.data?.data) {
        setConfig(cfgRes.data.data);
        setTournament(cfgRes.data.data.tournament);
      }

      // 2. Load tournament registered teams for preferred team dropdown
      try {
        const teamsRes = await axios.get(`/api/tournaments/${tournamentId}/teams`);
        if (teamsRes.data?.data) {
          setRegisteredTeams(teamsRes.data.data);
        }
      } catch (tErr) {}

      // 3. Load user's existing registration if logged in
      if (token) {
        try {
          const myRegRes = await axios.get(`/api/tournaments/${tournamentId}/my-registration`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (myRegRes.data?.data) {
            setMyRegistration(myRegRes.data.data);
          }
        } catch (mErr) {}

        // Pre-fill user profile info from localStorage if available
        try {
          const userJson = localStorage.getItem('turf_user');
          if (userJson) {
            const user = JSON.parse(userJson);
            setFormData(prev => ({
              ...prev,
              fullName: prev.fullName || user.fullName || user.full_name || user.name || '',
              phone: prev.phone || user.phone || '',
              email: prev.email || user.email || ''
            }));
          }
        } catch (uErr) {}
      }
    } catch (err) {
      console.error('Failed to load tournament registration:', err);
      setFormError(err.response?.data?.message || 'Failed to load tournament details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) loadData();
  }, [tournamentId]);

  // Handle DOB change and auto-calculate Age
  const handleDobChange = (e) => {
    const dobStr = e.target.value;
    setFormData(prev => ({ ...prev, dateOfBirth: dobStr }));
    setAgeError('');

    if (dobStr) {
      const dob = new Date(dobStr);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let calcAge = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          calcAge--;
        }
        setFormData(prev => ({ ...prev, age: calcAge }));

        // Validate age limits if set
        if (config?.minAge && calcAge < config.minAge) {
          setAgeError(`Minimum age required for this tournament is ${config.minAge} years (Your age: ${calcAge}).`);
        } else if (config?.maxAge && calcAge > config.maxAge) {
          setAgeError(`Maximum age allowed for this tournament is ${config.maxAge} years (Your age: ${calcAge}).`);
        }
      }
    } else {
      setFormData(prev => ({ ...prev, age: '' }));
    }
  };

  // Handle Aadhaar verification on blur / change
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\s+/g, '');
    setFormData(prev => ({ ...prev, aadhaar: raw }));
    setAadhaarError('');

    if (raw.length === 12) {
      if (!validateVerhoeff(raw)) {
        setAadhaarError('Invalid Aadhaar number (Verhoeff checksum failed). Please verify your 12 digits.');
      }
    } else if (raw.length > 0 && raw.length !== 12) {
      setAadhaarError('Aadhaar must be exactly 12 digits.');
    }
  };

  // Handle Photo File Pick
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Submit Player Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!isLoggedIn) {
      setFormError('Please log in or sign up to submit your player registration.');
      return;
    }

    const fConf = config?.fieldsConfig || {};

    // Validate required fields
    if (fConf.fullName?.status === 'REQUIRED' && !formData.fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (fConf.phone?.status === 'REQUIRED' && !formData.phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (fConf.dateOfBirth?.status === 'REQUIRED' && !formData.dateOfBirth) {
      setFormError('Date of birth is required.');
      return;
    }
    if (fConf.aadhaar?.status === 'REQUIRED' && !formData.aadhaar) {
      setFormError('12-digit Aadhaar number is required.');
      return;
    }

    if (formData.aadhaar && !validateVerhoeff(formData.aadhaar)) {
      setFormError('Invalid 12-digit Aadhaar number.');
      return;
    }

    if (ageError) {
      setFormError(ageError);
      return;
    }

    // Consent check if sensitive data provided
    if ((formData.aadhaar || formData.address) && !formData.consentAgreed) {
      setFormError('You must agree to the identity verification consent to submit sensitive details.');
      return;
    }

    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('fullName', formData.fullName.trim());
      formPayload.append('dateOfBirth', formData.dateOfBirth);
      formPayload.append('playingHand', formData.playingHand);
      formPayload.append('phone', formData.phone.trim());
      formPayload.append('email', formData.email.trim());
      formPayload.append('address', formData.address.trim());
      formPayload.append('aadhaar', formData.aadhaar.trim());
      formPayload.append('preferredRole', formData.preferredRole);
      formPayload.append('preferredTeamId', formData.preferredTeamId);
      formPayload.append('jerseySize', formData.jerseySize);
      formPayload.append('consentAgreed', formData.consentAgreed ? 'true' : 'false');
      formPayload.append('customFieldsData', JSON.stringify(formData.customFields));

      if (photoFile) {
        formPayload.append('photo', photoFile);
      }

      const res = await axios.post(`/api/tournaments/${tournamentId}/player-registrations`, formPayload, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Registration request submitted successfully!');
        // Refresh registration state
        loadData();
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setFormError(err.response?.data?.message || 'Failed to submit registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw pending registration
  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw your tournament registration request?')) return;
    try {
      const res = await axios.delete(`/api/tournaments/${tournamentId}/my-registration`, {
        headers: getAuthHeaders()
      });
      if (res.data.success) {
        alert('Your registration request has been withdrawn.');
        setMyRegistration(null);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to withdraw registration.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading tournament registration details…</p>
        </div>
      </div>
    );
  }

  const fConf = config?.fieldsConfig || {};

  return (
    <div style={{ maxWidth: '780px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Back to Tournament Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href={`/tournaments/${tournamentId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--accent-primary, #10b981)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Back to Tournament Overview
        </Link>
      </div>

      {/* Tournament Card Header */}
      <div className="glass-panel" style={{
        padding: '1.5rem',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-color)',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.06))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: config?.isOpen ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              color: config?.isOpen ? '#10b981' : '#ef4444',
              marginBottom: '0.5rem'
            }}>
              {config?.isOpen ? '● REGISTRATIONS OPEN' : '✕ REGISTRATIONS CLOSED'}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
              {tournament?.name || 'Tournament'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Trophy size={14} color="#10b981" /> {tournament?.sportName || 'Sports'}
              </span>
              {config?.registrationDeadline && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} color="#eab308" /> Deadline: {new Date(config.registrationDeadline).toLocaleDateString()}
                </span>
              )}
              {config?.maxPlayers && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={14} color="#3b82f6" /> Max: {config.maxPlayers} players
                </span>
              )}
            </div>
          </div>

          {config?.isFull && (
            <div style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.3)',
              color: '#a855f7',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              Tournament Full (Waitlist Active)
            </div>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {formError && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={18} />
          {formError}
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.88rem'
        }}>
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* CASE A: USER ALREADY HAS A REGISTRATION REQUEST          */}
      {/* ───────────────────────────────────────────────────────── */}
      {myRegistration && (
        <div className="glass-panel" style={{
          padding: '1.75rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
              Your Registration Status
            </h3>
            <span style={{
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              background: myRegistration.status === 'CONFIRMED' ? 'rgba(16,185,129,0.2)' :
                          myRegistration.status === 'APPROVED' ? 'rgba(59,130,246,0.2)' :
                          myRegistration.status === 'WAITLISTED' ? 'rgba(168,85,247,0.2)' :
                          myRegistration.status === 'DENIED' ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
              color: myRegistration.status === 'CONFIRMED' ? '#10b981' :
                     myRegistration.status === 'APPROVED' ? '#3b82f6' :
                     myRegistration.status === 'WAITLISTED' ? '#a855f7' :
                     myRegistration.status === 'DENIED' ? '#ef4444' : '#eab308'
            }}>
              {myRegistration.status}
            </span>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            padding: '1.25rem',
            border: '1px solid var(--border-color)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Registered Name:</span>{' '}
                <strong style={{ color: 'var(--text-heading)' }}>{myRegistration.full_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Playing Hand:</span>{' '}
                <strong style={{ color: 'var(--text-heading)' }}>{myRegistration.playing_hand}</strong>
              </div>
              {myRegistration.age && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Age:</span>{' '}
                  <strong style={{ color: 'var(--text-heading)' }}>{myRegistration.age} yrs</strong>
                </div>
              )}
              {myRegistration.preferred_role && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Preferred Role:</span>{' '}
                  <strong style={{ color: 'var(--text-heading)' }}>{myRegistration.preferred_role}</strong>
                </div>
              )}
              {myRegistration.assigned_team_name && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Squad:</span>{' '}
                  <strong style={{ color: '#10b981' }}>{myRegistration.assigned_team_name}</strong>
                </div>
              )}
              {myRegistration.aadhaar_last4 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Aadhaar:</span>{' '}
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-heading)' }}>XXXX-XXXX-{myRegistration.aadhaar_last4}</span>
                </div>
              )}
            </div>

            {myRegistration.denial_reason && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: '0.85rem'
              }}>
                <strong>Reason from Organizer:</strong> {myRegistration.denial_reason}
              </div>
            )}
          </div>

          {myRegistration.status === 'PENDING' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleWithdraw}
                className="btn btn-outline btn-sm"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                Withdraw Registration Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* CASE B: NEW REGISTRATION FORM                             */}
      {/* ───────────────────────────────────────────────────────── */}
      {!myRegistration && config?.isOpen && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{
          padding: '1.75rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: 'var(--text-heading)' }}>
            Player Registration Form
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Complete your tournament profile. Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Full Name */}
            {fConf.fullName?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name {fConf.fullName?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="text"
                  required={fConf.fullName?.status === 'REQUIRED'}
                  placeholder="e.g. Kundan Kumar"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            {/* Date of Birth */}
            {fConf.dateOfBirth?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Date of Birth {fConf.dateOfBirth?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                  {formData.age !== '' && (
                    <span style={{ color: '#10b981', marginLeft: '0.5rem', fontWeight: 700 }}>
                      ({formData.age} years old)
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  required={fConf.dateOfBirth?.status === 'REQUIRED'}
                  value={formData.dateOfBirth}
                  onChange={handleDobChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: ageError ? '1px solid #ef4444' : '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                />
                {ageError && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{ageError}</div>}
              </div>
            )}

            {/* Playing Hand */}
            {fConf.playingHand?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Playing Hand {fConf.playingHand?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <select
                  value={formData.playingHand}
                  onChange={(e) => setFormData(prev => ({ ...prev, playingHand: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="RIGHT">Right-Handed</option>
                  <option value="LEFT">Left-Handed</option>
                </select>
              </div>
            )}

            {/* Contact Phone */}
            {fConf.phone?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Phone Number {fConf.phone?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="tel"
                  required={fConf.phone?.status === 'REQUIRED'}
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            {/* Email */}
            {fConf.email?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address {fConf.email?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="email"
                  required={fConf.email?.status === 'REQUIRED'}
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            {/* Preferred Role / Position */}
            {fConf.preferredRole?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Preferred Role / Position {fConf.preferredRole?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g. All-Rounder, Singles, Striker"
                  value={formData.preferredRole}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredRole: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            )}

            {/* Preferred Team */}
            {fConf.preferredTeam?.status !== 'HIDDEN' && registeredTeams.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Preferred Team (Optional)
                </label>
                <select
                  value={formData.preferredTeamId}
                  onChange={(e) => setFormData(prev => ({ ...prev, preferredTeamId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="">-- Any Team / Free Agent --</option>
                  {registeredTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Jersey Size */}
            {fConf.jerseySize?.status !== 'HIDDEN' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Jersey Size {fConf.jerseySize?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <select
                  value={formData.jerseySize}
                  onChange={(e) => setFormData(prev => ({ ...prev, jerseySize: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card, #111)',
                    color: 'var(--text-heading)',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="S">S (38)</option>
                  <option value="M">M (40)</option>
                  <option value="L">L (42)</option>
                  <option value="XL">XL (44)</option>
                  <option value="XXL">XXL (46)</option>
                </select>
              </div>
            )}
          </div>

          {/* Sensitive Identity Fields (Aadhaar & Address) */}
          {(fConf.aadhaar?.status !== 'HIDDEN' || fConf.address?.status !== 'HIDDEN') && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.04)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Lock size={16} color="#60a5fa" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                  Verified Identity Details (Encrypted at rest)
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
                {fConf.aadhaar?.status !== 'HIDDEN' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      12-Digit Aadhaar Number {fConf.aadhaar?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      required={fConf.aadhaar?.status === 'REQUIRED'}
                      placeholder="Enter 12-digit Aadhaar"
                      value={formData.aadhaar}
                      onChange={handleAadhaarChange}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: aadhaarError ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        background: 'var(--bg-card, #111)',
                        color: 'var(--text-heading)',
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                        fontSize: '0.95rem'
                      }}
                    />
                    {aadhaarError ? (
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{aadhaarError}</div>
                    ) : formData.aadhaar.length === 12 ? (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem' }}>✓ Valid 12-digit Aadhaar checksum</div>
                    ) : null}
                  </div>
                )}

                {fConf.address?.status !== 'HIDDEN' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Residential Address {fConf.address?.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="text"
                      required={fConf.address?.status === 'REQUIRED'}
                      placeholder="Apartment, Street, City, Pincode"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card, #111)',
                        color: 'var(--text-heading)',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                🔒 Your Aadhaar number and residential address are encrypted at rest with AES-256 and masked (XXXX-XXXX-1234) everywhere in the system. They are accessed only for authorized identity verification.
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {fConf.customFields && fConf.customFields.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text-heading)' }}>
                Additional Tournament Questions
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {fConf.customFields.map((cf) => (
                  <div key={cf.id || cf.name}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      {cf.label} {cf.status === 'REQUIRED' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>

                    {cf.type === 'dropdown' ? (
                      <select
                        value={formData.customFields[cf.name] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customFields: { ...prev.customFields, [cf.name]: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card, #111)',
                          color: 'var(--text-heading)',
                          fontSize: '0.88rem'
                        }}
                      >
                        <option value="">-- Choose option --</option>
                        {(cf.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : cf.type === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(formData.customFields[cf.name])}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            customFields: { ...prev.customFields, [cf.name]: e.target.checked }
                          }))}
                        />
                        {cf.label}
                      </label>
                    ) : (
                      <input
                        type="text"
                        value={formData.customFields[cf.name] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customFields: { ...prev.customFields, [cf.name]: e.target.value }
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card, #111)',
                          color: 'var(--text-heading)',
                          fontSize: '0.88rem'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Consent Checkbox */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                required={(formData.aadhaar || formData.address) ? true : false}
                checked={formData.consentAgreed}
                onChange={(e) => setFormData(prev => ({ ...prev, consentAgreed: e.target.checked }))}
                style={{ marginTop: '0.2rem' }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {config?.consentText ||
                  'I consent to the collection and verification of my details for this tournament. Sensitive identity data (such as Aadhaar and address) is securely encrypted and accessible only to authorized organizers.'}
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 700
              }}
            >
              {submitting ? 'Submitting Application...' : 'Submit Player Registration'}
            </button>
          </div>
        </form>
      )}

      {/* Case C: Closed Notice */}
      {!config?.isOpen && !myRegistration && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '16px' }}>
          <XCircle size={40} color="#ef4444" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
            Registrations Are Currently Closed
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            The tournament organizer has closed registration requests for this tournament or the registration deadline has passed.
          </p>
        </div>
      )}
    </div>
  );
}
