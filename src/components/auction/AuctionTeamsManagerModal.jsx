'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Users, Plus, Save, AlertCircle, Shield, CheckCircle, RefreshCw, Trash2, Wallet } from 'lucide-react';

const AuctionTeamsManagerModal = ({ isOpen, onClose, auctionId, tournamentId, onUpdated }) => {
  const [auctionTeams, setAuctionTeams] = useState([]);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form for adding/registering a team
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [customWallet, setCustomWallet] = useState(10000000);
  const [representativeEmail, setRepresentativeEmail] = useState('');

  const fetchData = async () => {
    if (!auctionId) return;
    setLoading(true);
    setError('');
    try {
      const [auctionRes, tourRes] = await Promise.all([
        axios.get(`/api/auctions/${auctionId}`),
        axios.get(`/api/tournaments/${tournamentId}/teams`)
      ]);

      if (auctionRes.data.success) {
        setAuctionTeams(auctionRes.data.data.teams || []);
      }
      if (tourRes.data.success) {
        setTournamentTeams(tourRes.data.data.items || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, auctionId, tournamentId]);

  if (!isOpen) return null;

  // Teams that are in tournament but not yet in auction
  const unregisteredTeams = tournamentTeams.filter(
    (tt) => !auctionTeams.some((at) => at.teamId === tt.id || at.teamId === tt.uuid)
  );

  const handleRegisterSingleTeam = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a team to add.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        teams: [
          {
            teamId: selectedTeamId,
            customBudget: customWallet,
            representativeEmail: representativeEmail.trim() || undefined
          }
        ]
      };
      const res = await axios.post(`/api/auctions/${auctionId}/teams`, payload);
      if (res.data.success) {
        setSuccess('Team registered to auction successfully.');
        setSelectedTeamId('');
        setRepresentativeEmail('');
        fetchData();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to register team.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkRegisterAll = async () => {
    if (unregisteredTeams.length === 0) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        teams: unregisteredTeams.map((tt) => ({
          teamId: tt.id,
          customBudget: customWallet
        }))
      };
      const res = await axios.post(`/api/auctions/${auctionId}/teams`, payload);
      if (res.data.success) {
        setSuccess(`Successfully registered ${unregisteredTeams.length} teams.`);
        fetchData();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to bulk register teams.');
    } finally {
      setSaving(false);
    }
  };

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
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: 'var(--text-main, #fff)',
        padding: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-secondary, #3b82f6)' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
                Auction Teams & Budgets
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Configure individual team wallets, representatives, and squad limits
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

        {/* Add Team Section */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Add Team to Auction
            </h3>
            {unregisteredTeams.length > 0 && (
              <button
                type="button"
                onClick={handleBulkRegisterAll}
                disabled={saving}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: 'var(--accent-secondary, #3b82f6)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Register All {unregisteredTeams.length} Tournament Teams
              </button>
            )}
          </div>

          <form onSubmit={handleRegisterSingleTeam} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 100px', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                Select Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
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
                <option value="">-- Choose team --</option>
                {unregisteredTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                Auction Budget (₹)
              </label>
              <input
                type="number"
                step="50000"
                min="100000"
                value={customWallet}
                onChange={(e) => setCustomWallet(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '6px',
                  color: 'var(--accent-primary, #10b981)',
                  fontWeight: 700,
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                Team Rep Email (Optional)
              </label>
              <input
                type="email"
                placeholder="representative@domain.com"
                value={representativeEmail}
                onChange={(e) => setRepresentativeEmail(e.target.value)}
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

            <button
              type="submit"
              disabled={saving || !selectedTeamId}
              style={{
                background: 'var(--accent-primary, #10b981)',
                border: 'none',
                color: 'var(--text-on-accent, #022c22)',
                padding: '0.6rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: saving || !selectedTeamId ? 'not-allowed' : 'pointer',
                opacity: saving || !selectedTeamId ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <Plus size={16} /> Add
            </button>
          </form>
        </div>

        {/* Participating Teams List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Registered Participating Teams ({auctionTeams.length})
            </h3>
            <button
              type="button"
              onClick={fetchData}
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
              Loading teams...
            </div>
          ) : auctionTeams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'var(--text-muted, #94a3b8)' }}>
              No teams added to this auction yet. Add teams using the form above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {auctionTeams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    background: 'var(--bg-card, rgba(18,25,38,0.75))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    borderRadius: '10px',
                    padding: '0.85rem 1.15rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {team.teamLogo ? (
                        <img src={team.teamLogo} alt={team.teamName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Shield size={20} color="var(--accent-primary, #10b981)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading, #fff)' }}>
                        {team.teamName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                        Rep: {team.representativeName || 'Unassigned'} • Squad: {team.playersPurchased} / {team.minSquadSize}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Wallet</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                        ₹{Number(team.totalBudget).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Balance</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary, #cbd5e1)' }}>
                        ₹{Number(team.remainingBalance).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Reserve</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-amber, #f59e0b)' }}>
                        ₹{Number(team.reservedBudget).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Available</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>
                        ₹{Number(team.availableBiddingBudget).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '1.25rem' }}>
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

export default AuctionTeamsManagerModal;
