'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  Clock,
  Radio,
  Calendar,
  Layers,
  X,
  ExternalLink
} from 'lucide-react';

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function OfficialScorersManager({ tournament, canManage, matches = [], currentUser = null }) {
  const tournamentId = tournament?.uuid || tournament?.id;
  const isPickleball = tournament?.sport?.slug === 'pickleball' || tournament?.name?.toLowerCase().includes('pickleball');

  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [scopeType, setScopeType] = useState('ALL'); // 'ALL' | 'MATCH'
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Remove confirmation state
  const [removingId, setRemovingId] = useState(null);

  // Fetch scorers list
  const fetchScorers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/scorers`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setScorers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch scorers:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load assigned scorers.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchScorers();
  }, [fetchScorers]);

  // Debounced User Search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`/api/tournaments/scorers/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: getAuthHeaders()
        });
        if (res.data?.success) {
          setSearchResults(res.data.data || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle assign scorer submit
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('Please select a user to assign as scorer.');
      return;
    }

    if (scopeType === 'MATCH' && !selectedMatchId) {
      setErrorMsg('Please select a specific match for this scorer assignment.');
      return;
    }

    setAssignSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        userId: selectedUser.id,
        matchId: scopeType === 'MATCH' ? selectedMatchId : null
      };

      const res = await axios.post(`/api/tournaments/${tournamentId}/scorers`, payload, {
        headers: getAuthHeaders()
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Scorer successfully assigned!');
        setShowAssignModal(false);
        setSelectedUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setScopeType('ALL');
        setSelectedMatchId('');
        fetchScorers();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to assign scorer.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle remove scorer
  const handleRemoveScorer = async (assignmentId, scorerName) => {
    if (!window.confirm(`Are you sure you want to revoke scorer access for ${scorerName}?`)) {
      return;
    }

    setRemovingId(assignmentId);
    setErrorMsg('');
    try {
      const res = await axios.delete(`/api/tournaments/${tournamentId}/scorers/${assignmentId}`, {
        headers: getAuthHeaders()
      });
      if (res.data?.success) {
        setSuccessMsg(`Revoked scoring access for ${scorerName}.`);
        fetchScorers();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove scorer access.');
    } finally {
      setRemovingId(null);
    }
  };

  // Current user's assignments
  const userAssignments = scorers.filter(s => s.userId === currentUser?.id);
  const isUserTournamentScorer = userAssignments.some(s => !s.matchId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Alert Messages */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header and Action Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
        backdropFilter: 'blur(10px)',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-heading, #fff)' }}>
            <ShieldCheck size={22} style={{ color: '#10b981' }} /> Official Tournament Scorers
          </h3>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-muted, #94a3b8)' }}>
            Designated scorers have authoritative access to score balls/points, update tosses, and finalize official tournament matches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchScorers}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          {canManage && (
            <button
              onClick={() => {
                setSelectedUser(null);
                setSearchQuery('');
                setSearchResults([]);
                setScopeType('ALL');
                setSelectedMatchId('');
                setShowAssignModal(true);
              }}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                fontWeight: 700
              }}
            >
              <UserPlus size={16} /> Assign Official Scorer
            </button>
          )}
        </div>
      </div>

      {/* User Scoring Access Highlight (if logged in user is assigned) */}
      {(isUserTournamentScorer || userAssignments.length > 0) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                You Have Official Scorer Access!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                {isUserTournamentScorer
                  ? 'You are authorized to score all matches across this tournament.'
                  : `You are authorized to score ${userAssignments.length} assigned match(es).`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {userAssignments.map(a => (
              <Link
                key={a.assignmentId}
                href={a.matchId ? (isPickleball ? `/matches/${a.matchPublicId || a.matchId}/pickleball-scorer` : `/matches/${a.matchPublicId || a.matchId}/scorer`) : '#'}
                className="btn btn-sm btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#10b981', border: 'none' }}
              >
                <Zap size={13} /> {a.matchNumber ? `Score Match #${a.matchNumber}` : 'Score Live Match'}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Scorers Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>TOTAL SCORERS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading, #fff)', marginTop: '0.25rem' }}>
            {scorers.length}
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>TOURNAMENT-WIDE SCORERS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
            {scorers.filter(s => !s.matchId).length}
          </div>
        </div>
        <div style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>MATCH-SPECIFIC SCORERS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
            {scorers.filter(s => s.matchId).length}
          </div>
        </div>
      </div>

      {/* Scorers Cards / Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #94a3b8)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: '#10b981' }} />
          <div>Loading official scorers...</div>
        </div>
      ) : scorers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: 'var(--bg-card, rgba(30, 41, 59, 0.5))',
          borderRadius: '16px',
          border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.12))'
        }}>
          <ShieldCheck size={48} style={{ color: 'var(--text-muted, #64748b)', margin: '0 auto 1rem' }} />
          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #fff)' }}>
            No Official Scorers Assigned Yet
          </h4>
          <p style={{ maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5 }}>
            As the tournament organizer or super admin, you can assign registered users to score matches across the tournament or for specific fixtures.
          </p>
          {canManage && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', border: 'none' }}
            >
              <UserPlus size={16} /> Assign First Scorer
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          borderRadius: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Scorer</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Contact</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Scoring Scope</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Assigned Date</th>
                  {canManage && <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {scorers.map((s) => {
                  const isMatchScope = Boolean(s.matchId);
                  return (
                    <tr
                      key={s.assignmentId}
                      style={{
                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Scorer Info */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isMatchScope ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isMatchScope ? '#38bdf8' : '#34d399',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}>
                            {s.fullName?.slice(0, 2).toUpperCase() || 'SC'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading, #fff)' }}>
                              {s.fullName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              User ID #{s.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ color: 'var(--text-primary, #e2e8f0)' }}>{s.email || '—'}</div>
                        {s.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>{s.phone}</div>}
                      </td>

                      {/* Scope Badge */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {isMatchScope ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            color: '#38bdf8',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                          }}>
                            <Calendar size={13} />
                            {s.scope}
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            fontWeight: 600,
                            fontSize: '0.8rem'
                          }}>
                            <Layers size={13} />
                            Entire Tournament (All Matches)
                          </div>
                        )}
                      </td>

                      {/* Assigned Date */}
                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-muted, #94a3b8)', fontSize: '0.82rem' }}>
                        {s.assignedAt ? new Date(s.assignedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleRemoveScorer(s.assignmentId, s.fullName)}
                            disabled={removingId === s.assignmentId}
                            className="btn btn-outline btn-sm"
                            style={{
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.8rem'
                            }}
                            title="Revoke Scorer Access"
                          >
                            <Trash2 size={13} />
                            {removingId === s.assignmentId ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Assign Scorer Modal ── */}
      {showAssignModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-modal, var(--bg-card))',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={22} style={{ color: '#10b981' }} />
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Assign Official Scorer
                </h4>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Step 1: User Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-heading)' }}>
                  1. Search Registered User
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or phone number..."
                    className="form-control"
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      borderRadius: '10px',
                      paddingTop: '0.65rem',
                      paddingBottom: '0.65rem'
                    }}
                  />
                  {isSearching && (
                    <RefreshCw size={14} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>

                {/* Search Results Dropdown/List */}
                {searchResults.length > 0 && (
                  <div style={{
                    marginTop: '0.5rem',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.35rem'
                  }}>
                    {searchResults.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchResults([]);
                          }}
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-heading)' }}>{u.full_name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {u.email} {u.phone ? `• ${u.phone}` : ''}
                            </div>
                          </div>
                          {u.role && (
                            <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tag)', color: 'var(--text-muted)' }}>
                              {u.role}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected User Badge */}
                {selectedUser && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <UserCheck size={18} style={{ color: '#34d399' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{selectedUser.full_name}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: Scope Assignment */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>
                  2. Scoring Scope
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <label style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: scopeType === 'ALL' ? '2px solid #10b981' : '1px solid var(--border-color)',
                    background: scopeType === 'ALL' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}>
                    <input
                      type="radio"
                      name="scopeType"
                      value="ALL"
                      checked={scopeType === 'ALL'}
                      onChange={() => setScopeType('ALL')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-heading)' }}>All Matches</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Can score any match in this tournament
                      </div>
                    </div>
                  </label>

                  <label style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: scopeType === 'MATCH' ? '2px solid #38bdf8' : '1px solid var(--border-color)',
                    background: scopeType === 'MATCH' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}>
                    <input
                      type="radio"
                      name="scopeType"
                      value="MATCH"
                      checked={scopeType === 'MATCH'}
                      onChange={() => setScopeType('MATCH')}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-heading)' }}>Specific Match</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Restricted to one specific fixture
                      </div>
                    </div>
                  </label>
                </div>

                {/* Match selection dropdown if specific match */}
                {scopeType === 'MATCH' && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-muted)' }}>
                      Select Match:
                    </label>
                    <select
                      value={selectedMatchId}
                      onChange={(e) => setSelectedMatchId(e.target.value)}
                      className="form-control"
                      style={{
                        width: '100%',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.75rem'
                      }}
                    >
                      <option value="">-- Choose Match --</option>
                      {matches.map((m) => (
                        <option key={m.id || m.uuid} value={m.uuid || m.id}>
                          Match #{m.match_number || m.matchNumber}: {m.team_a_name || m.teamA?.name || 'Team A'} vs {m.team_b_name || m.teamB?.name || 'Team B'} ({m.status})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-elevated)'
            }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn btn-outline"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignSubmit}
                disabled={!selectedUser || assignSubmitting}
                className="btn btn-primary"
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#10b981',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700
                }}
              >
                {assignSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Assigning...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
