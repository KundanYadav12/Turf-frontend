'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserPlus, Users, AlertCircle, CheckCircle, RefreshCw, Trash2, Edit2, Search, Filter } from 'lucide-react';

const AuctionPlayersManagerModal = ({ isOpen, onClose, auctionId, categories = [], onUpdated }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Player Form State
  const [newPlayer, setNewPlayer] = useState({
    playerName: '',
    role: 'ALL_ROUNDER',
    battingStyle: 'RIGHT_HAND',
    bowlingStyle: 'RIGHT_ARM_FAST',
    categoryId: categories[0]?.id || '',
    previousTeam: '',
    profilePhoto: ''
  });

  const fetchPlayers = async () => {
    if (!auctionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/auctions/${auctionId}/players`);
      if (res.data.success) {
        setPlayers(res.data.data.items || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load auction players.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
      if (categories && categories.length > 0 && !newPlayer.categoryId) {
        setNewPlayer((prev) => ({ ...prev, categoryId: categories[0].id }));
      }
    }
  }, [isOpen, auctionId, categories]);

  if (!isOpen) return null;

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayer.playerName.trim()) {
      setError('Player name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`/api/auctions/${auctionId}/players`, {
        players: [
          {
            playerName: newPlayer.playerName.trim(),
            role: newPlayer.role,
            battingStyle: newPlayer.battingStyle,
            bowlingStyle: newPlayer.bowlingStyle,
            categoryId: newPlayer.categoryId,
            previousTeam: newPlayer.previousTeam.trim() || undefined,
            profilePhoto: newPlayer.profilePhoto.trim() || undefined
          }
        ]
      });

      if (res.data.success) {
        setSuccess('Player added to auction pool successfully.');
        setNewPlayer({
          playerName: '',
          role: 'ALL_ROUNDER',
          battingStyle: 'RIGHT_HAND',
          bowlingStyle: 'RIGHT_ARM_FAST',
          categoryId: categories[0]?.id || '',
          previousTeam: '',
          profilePhoto: ''
        });
        fetchPlayers();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to add player.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player from the auction pool?')) return;
    try {
      const res = await axios.delete(`/api/auctions/${auctionId}/players/${playerId}`);
      if (res.data.success) {
        setSuccess('Player removed from auction pool.');
        fetchPlayers();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove player.');
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.role && p.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.categoryName && p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-modal, #0f172a)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: 'var(--text-main, #fff)',
        padding: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-primary, #10b981)' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
                Auction Players Pool ({players.length})
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Manage player eligibility, assigned categories, and base prices
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Add Player Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-heading, #fff)' }}>
            + Register Eligible Player
          </h3>
          <form onSubmit={handleAddPlayer}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hardik Pandya"
                  value={newPlayer.playerName}
                  onChange={(e) => setNewPlayer({ ...newPlayer, playerName: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Category *
                </label>
                <select
                  value={newPlayer.categoryId}
                  onChange={(e) => setNewPlayer({ ...newPlayer, categoryId: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Base: ₹{Number(c.basePrice).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Role *
                </label>
                <select
                  value={newPlayer.role}
                  onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="BATTER">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="WICKET_KEEPER">Wicketkeeper</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Batting Style
                </label>
                <select
                  value={newPlayer.battingStyle}
                  onChange={(e) => setNewPlayer({ ...newPlayer, battingStyle: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="RIGHT_HAND">Right Hand Bat</option>
                  <option value="LEFT_HAND">Left Hand Bat</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Bowling Style
                </label>
                <select
                  value={newPlayer.bowlingStyle}
                  onChange={(e) => setNewPlayer({ ...newPlayer, bowlingStyle: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="RIGHT_ARM_FAST">Right Arm Fast</option>
                  <option value="LEFT_ARM_FAST">Left Arm Fast</option>
                  <option value="RIGHT_ARM_SPIN">Right Arm Spin</option>
                  <option value="LEFT_ARM_SPIN">Left Arm Spin</option>
                  <option value="NONE">None</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Previous Team (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai Warriors"
                  value={newPlayer.previousTeam}
                  onChange={(e) => setNewPlayer({ ...newPlayer, previousTeam: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input, rgba(15,23,42,0.9))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--accent-primary, #10b981)',
                  border: 'none',
                  color: 'var(--text-on-accent, #022c22)',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                <UserPlus size={16} /> {saving ? 'Adding...' : 'Add Player to Pool'}
              </button>
            </div>
          </form>
        </div>

        {/* Players List Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
              <input
                type="text"
                placeholder="Search player, role, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  color: '#fff',
                  paddingTop: '0.45rem',
                  paddingBottom: '0.45rem',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: '6px',
                color: '#fff',
                padding: '0.45rem 2.5rem 0.45rem 0.75rem',
                fontSize: '0.82rem'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_AUCTION">In Auction</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </select>

            <button
              onClick={fetchPlayers}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.78rem'
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Players Table */}
        <div style={{ border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', overflowX: 'auto', background: 'var(--bg-card, rgba(18,25,38,0.75))' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Player</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Base Price</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
                    No players found in this pool.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading, #fff)' }}>{p.playerName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                        {p.battingStyle} • {p.bowlingStyle}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'rgba(59,130,246,0.15)',
                        color: 'var(--accent-secondary, #3b82f6)'
                      }}>
                        {p.categoryName || 'Unassigned'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                      {p.role ? p.role.replace('_', ' ') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-primary, #10b981)' }}>
                      ₹{Number(p.basePrice).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: p.status === 'SOLD' ? 'rgba(16,185,129,0.15)' :
                                    p.status === 'UNSOLD' ? 'rgba(239,68,68,0.15)' :
                                    p.status === 'IN_AUCTION' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                        color: p.status === 'SOLD' ? '#34d399' :
                               p.status === 'UNSOLD' ? '#f87171' :
                               p.status === 'IN_AUCTION' ? '#f59e0b' : 'var(--text-muted, #94a3b8)'
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {p.status !== 'SOLD' && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlayer(p.id)}
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '1rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--accent-primary, #10b981)',
              border: 'none',
              color: 'var(--text-on-accent, #022c22)',
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionPlayersManagerModal;
