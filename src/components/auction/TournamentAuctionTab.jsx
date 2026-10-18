'use client';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
  Gavel, Users, DollarSign, Shield, Settings, UserPlus,
  Play, Pause, Award, BarChart2, CheckCircle, AlertTriangle, ArrowRight, RefreshCw, FileText
} from 'lucide-react';
import AuctionConfigModal from './AuctionConfigModal';
import AuctionTeamsManagerModal from './AuctionTeamsManagerModal';
import AuctionPlayersManagerModal from './AuctionPlayersManagerModal';
import AuctionReportsModal from './AuctionReportsModal';

const TournamentAuctionTab = ({ tournamentId, tournament }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [auctionData, setAuctionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTeamsModal, setShowTeamsModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);

  const isOwnerOrAdmin = user && (
    user.role === 'ADMIN' ||
    (tournament && (user.id === tournament.creator?.id || user.id === tournament.creator_id || user.id === tournament.creatorId))
  );

  const fetchAuctionDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/tournaments/${tournamentId}/auction`);
      if (res.data.success && res.data.data.hasAuction) {
        setAuctionData(res.data.data.auction);
      } else {
        setAuctionData(null);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setAuctionData(null);
      } else {
        setError(err?.response?.data?.message || 'Failed to load auction data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctionDetails();
  }, [tournamentId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #94a3b8)' }}>
        Loading auction details...
      </div>
    );
  }

  // If no auction is enabled yet
  if (!auctionData) {
    return (
      <div style={{
        background: 'var(--bg-card, rgba(18,25,38,0.75))',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center',
        maxWidth: '640px',
        margin: '0 auto'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          color: 'var(--accent-primary, #10b981)'
        }}>
          <Gavel size={32} />
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #fff)' }}>
          Cricket Player Auction Not Configured
        </h3>
        <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.75rem 0' }}>
          This tournament does not have an active player auction yet. Tournament administrators can configure team budgets, player base prices, and compulsory squad rules to begin.
        </p>

        {isOwnerOrAdmin ? (
          <button
            onClick={() => setShowConfigModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--accent-primary, #10b981)',
              border: 'none',
              color: 'var(--text-on-accent, #022c22)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Settings size={18} /> Configure Cricket Auction
          </button>
        ) : (
          <div style={{ color: 'var(--text-dim, #64748b)', fontSize: '0.82rem' }}>
            Only tournament administrators can configure the auction.
          </div>
        )}

        <AuctionConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          tournamentId={tournamentId}
          initialConfig={null}
          onSaved={() => fetchAuctionDetails()}
        />
      </div>
    );
  }

  const statusColor =
    auctionData.status === 'LIVE' ? '#ef4444' :
    auctionData.status === 'COMPLETED' ? '#10b981' :
    auctionData.status === 'PAUSED' ? '#f59e0b' : '#38bdf8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 100%)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        padding: '1.75rem',
        position: 'relative',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
              <span style={{
                background: statusColor,
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: '999px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {auctionData.status === 'LIVE' && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                )}
                {auctionData.status}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                {auctionData.biddingMode === 'OPERATOR_CONTROLLED' ? 'Operator Controlled' : 'Team Representative Bidding'}
              </span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800, margin: '0 0 0.4rem 0', color: 'var(--text-heading, #fff)' }}>
              {auctionData.name || 'Official Player Auction'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              Default Budget: ₹{(auctionData.defaultWalletAmount / 10000000).toFixed(2)} Cr per team • Compulsory Squad: {auctionData.minSquadSize} Players • Currency: {auctionData.currencySymbol}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to={`/auctions/${auctionData.id}/live`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: auctionData.status === 'LIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: auctionData.status === 'LIVE' ? '#022c22' : 'var(--accent-primary, #10b981)',
                padding: '0.75rem 1.4rem',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 800,
                textDecoration: 'none',
                boxShadow: auctionData.status === 'LIVE' ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Gavel size={18} /> Enter Live Auction
            </Link>

            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowConfigModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-card, rgba(18,25,38,0.75))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  color: 'var(--text-secondary, #cbd5e1)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Settings size={16} /> Settings
              </button>
            )}

            <button
              onClick={() => setShowReportsModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-card, rgba(18,25,38,0.75))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                color: 'var(--text-secondary, #cbd5e1)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileText size={16} /> Reports
            </button>
          </div>
        </div>

        {/* Admin Quick Action Chips */}
        {isOwnerOrAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTeamsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--accent-secondary, #3b82f6)',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Users size={14} /> Manage Teams & Wallets ({auctionData.teams ? auctionData.teams.length : 0})
            </button>

            <button
              onClick={() => setShowPlayersModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-primary, #10b981)',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <UserPlus size={14} /> Manage Player Pool ({auctionData.stats ? auctionData.stats.totalPlayers : 0})
            </button>
          </div>
        )}
      </div>

      {/* Key Stats Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', fontWeight: 600 }}>Participating Teams</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginTop: '4px' }}>
            {auctionData.teams ? auctionData.teams.length : 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', fontWeight: 600 }}>Total Players Pool</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-secondary, #3b82f6)', marginTop: '4px' }}>
            {auctionData.stats?.totalPlayers || 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', fontWeight: 600 }}>Players Sold</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)', marginTop: '4px' }}>
            {auctionData.stats?.soldPlayers || 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', fontWeight: 600 }}>Available / Unsold</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-amber, #f59e0b)', marginTop: '4px' }}>
            {(auctionData.stats?.availablePlayers || 0) + (auctionData.stats?.unsoldPlayers || 0)}
          </div>
        </div>

        <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)', fontWeight: 600 }}>Lowest Base Price</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-heading, #fff)', marginTop: '4px' }}>
            ₹{Number(auctionData.lowestEligibleBasePrice || 100000).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Categories & Base Prices */}
      <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-heading, #fff)' }}>
          Player Categories & Base Prices
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {auctionData.categories?.map((cat) => (
            <div
              key={cat.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                borderRadius: '10px',
                padding: '0.85rem 1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{cat.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Increment: +₹{Number(cat.bidIncrement).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                ₹{Number(cat.basePrice).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participating Teams Budget & Squad Progress */}
      <div style={{ background: 'var(--bg-card-solid, #101929)', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Participating Teams & Live Wallets
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
              Mandatory budget reserves are computed live based on compulsory squad requirements
            </span>
          </div>
          <button
            onClick={fetchAuctionDetails}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {(!auctionData.teams || auctionData.teams.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
            No teams registered to the auction yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {auctionData.teams.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card, rgba(18,25,38,0.75))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                  borderRadius: '12px',
                  padding: '1.15rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={20} color="var(--accent-primary, #10b981)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading, #fff)' }}>{t.teamName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>Rep: {t.representativeName || 'Unassigned'}</div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: t.playersPurchased >= t.minSquadSize ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                    color: t.playersPurchased >= t.minSquadSize ? '#34d399' : 'var(--accent-secondary, #3b82f6)'
                  }}>
                    {t.playersPurchased} / {t.minSquadSize} Players
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (t.playersPurchased / t.minSquadSize) * 100)}%`,
                    background: t.playersPurchased >= t.minSquadSize ? 'var(--accent-primary, #10b981)' : '#38bdf8'
                  }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim, #64748b)', fontSize: '0.72rem' }}>Total Wallet:</span>
                    <div style={{ fontWeight: 800, color: '#fff' }}>₹{Number(t.totalBudget).toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim, #64748b)', fontSize: '0.72rem' }}>Spent:</span>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>₹{Number(t.amountSpent).toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim, #64748b)', fontSize: '0.72rem' }}>Mandatory Reserve:</span>
                    <div style={{ fontWeight: 800, color: 'var(--accent-amber, #f59e0b)' }}>₹{Number(t.reservedBudget).toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim, #64748b)', fontSize: '0.72rem' }}>Available to Bid:</span>
                    <div style={{ fontWeight: 800, color: '#38bdf8' }}>₹{Number(t.availableBiddingBudget).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AuctionConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        tournamentId={tournamentId}
        initialConfig={auctionData}
        onSaved={() => fetchAuctionDetails()}
      />

      <AuctionTeamsManagerModal
        isOpen={showTeamsModal}
        onClose={() => setShowTeamsModal(false)}
        auctionId={auctionData.id}
        tournamentId={tournamentId}
        onUpdated={() => fetchAuctionDetails()}
      />

      <AuctionPlayersManagerModal
        isOpen={showPlayersModal}
        onClose={() => setShowPlayersModal(false)}
        auctionId={auctionData.id}
        categories={auctionData.categories || []}
        onUpdated={() => fetchAuctionDetails()}
      />

      <AuctionReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        auctionId={auctionData.id}
      />
    </div>
  );
};

export default TournamentAuctionTab;
