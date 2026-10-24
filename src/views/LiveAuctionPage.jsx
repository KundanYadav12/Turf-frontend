'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Gavel, ArrowLeft, Clock, Shield, Users, Trophy, Play, Pause,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Volume2, VolumeX,
  FileText, User, ChevronRight, Award, DollarSign
} from 'lucide-react';
import AuctionReportsModal from '../components/auction/AuctionReportsModal';

const LiveAuctionPage = () => {
  const { auctionId, id: tournamentIdParam } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Live Timer State (authoritative sync from backend)
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Available Players Modal / Dropdown for Operator
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedPlayerForBlock, setSelectedPlayerForBlock] = useState('');

  // Operator bid submission
  const [operatorBidTeamId, setOperatorBidTeamId] = useState('');

  // Post Auction Reports
  const [showReportsModal, setShowReportsModal] = useState(false);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Socket reference
  const socketRef = useRef(null);

  // Sound Effects using Web Audio API (zero external assets needed)
  const playSound = useCallback((type) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'bid') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'sold') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }, [soundEnabled]);

  // Resolve target auction identifier (can be uuid or tournament uuid)
  const targetId = auctionId || tournamentIdParam;

  const fetchAuction = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/auctions/${targetId}`);
      if (res.data.success) {
        setAuction(res.data.data.auction);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load auction.');
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  const fetchAvailablePlayers = async () => {
    if (!auction) return;
    try {
      const res = await axios.get(`/api/auctions/${auction.id}/players?status=AVAILABLE`);
      if (res.data.success) {
        setAvailablePlayers(res.data.data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch available players:', err);
    }
  };

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  // Socket.IO Real-Time Connection
  useEffect(() => {
    if (!auction?.id) return;

    const socketUrl = window.location.origin.includes('localhost') ? 'http://localhost:5008' : window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join:auction', { auctionId: auction.id });

    // Bid Placed Event
    socket.on('auction:bid', (data) => {
      playSound('bid');
      setActionError('');
      fetchAuction();
    });

    // Player Sold Event
    socket.on('auction:player:sold', (data) => {
      playSound('sold');
      setActionSuccess(`${data.playerName} SOLD to ${data.winningTeamName} for ₹${Number(data.soldPrice).toLocaleString('en-IN')}!`);
      setTimeout(() => setActionSuccess(''), 6000);
      fetchAuction();
    });

    // Player Unsold Event
    socket.on('auction:player:unsold', (data) => {
      playSound('warning');
      setActionError(`${data.playerName} marked as UNSOLD.`);
      setTimeout(() => setActionError(''), 5000);
      fetchAuction();
    });

    // Player On Block Event
    socket.on('auction:player:on_block', (data) => {
      playSound('bid');
      setActionError('');
      fetchAuction();
    });

    // Auction Status Changed
    socket.on('auction:status', (data) => {
      fetchAuction();
    });

    return () => {
      socket.emit('leave:auction', { auctionId: auction.id });
      socket.disconnect();
    };
  }, [auction?.id, fetchAuction, playSound]);

  // Synchronized Countdown Timer
  useEffect(() => {
    if (!auction?.currentPlayer?.timerEndAt) {
      setTimeLeft(0);
      setTimerActive(false);
      return;
    }

    const interval = setInterval(() => {
      const end = new Date(auction.currentPlayer.timerEndAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));
      setTimeLeft(diff);
      setTimerActive(diff > 0);

      if (diff <= 5 && diff > 0) {
        playSound('warning');
      }
    }, 500);

    return () => clearInterval(interval);
  }, [auction?.currentPlayer?.timerEndAt, playSound]);

  // User Roles & Representation
  const isOperatorOrAdmin = user && (
    user.role === 'ADMIN' ||
    user.role === 'AUCTIONEER' ||
    user.role === 'VENUE_OWNER' ||
    (auction && (user.id === auction.creatorId || user.id === auction.creator_id))
  );

  // Check if current user is representative for any participating team
  const userTeam = auction?.teams?.find(
    (t) => t.representativeUserId === user?.id || t.representativeEmail === user?.email
  );

  // Operator Actions
  const handleStartAuction = async () => {
    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/start`);
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to start auction.');
    }
  };

  const handlePauseAuction = async () => {
    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/pause`);
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to pause auction.');
    }
  };

  const handleResumeAuction = async () => {
    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/resume`);
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to resume auction.');
    }
  };

  const handleBringPlayerOnBlock = async (playerId) => {
    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/block`, { playerId });
      setShowPlayerPicker(false);
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to bring player onto block.');
    }
  };

  const handleMarkSold = async () => {
    if (!auction?.currentPlayer) return;
    if (!window.confirm(`Confirm sale of ${auction.currentPlayer.playerName} to ${auction.currentPlayer.highestBidder?.teamName || 'Highest Bidder'} for ₹${Number(auction.currentPlayer.currentBid).toLocaleString('en-IN')}?`)) return;

    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/sold`, {
        playerId: auction.currentPlayer.id
      });
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to mark player as sold.');
    }
  };

  const handleMarkUnsold = async () => {
    if (!auction?.currentPlayer) return;
    if (!window.confirm(`Mark ${auction.currentPlayer.playerName} as UNSOLD?`)) return;

    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/unsold`, {
        playerId: auction.currentPlayer.id
      });
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to mark player as unsold.');
    }
  };

  // Place Bid (Operator or Team Representative)
  const handlePlaceBid = async (biddingTeamId, bidAmount) => {
    if (!biddingTeamId || !bidAmount) {
      setActionError('Please select a team and bid amount.');
      return;
    }

    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/bids`, {
        auctionTeamId: biddingTeamId,
        bidAmount
      });
      fetchAuction();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Bid rejected.');
    }
  };

  const handleCompleteAuction = async () => {
    if (!window.confirm('Mark this auction as COMPLETED? This will validate that all teams satisfy compulsory squad requirements.')) return;
    try {
      setActionError('');
      await axios.post(`/api/auctions/${auction.id}/complete`);
      fetchAuction();
      setActionSuccess('Auction marked as COMPLETED successfully!');
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Cannot complete auction.');
    }
  };

  if (loading && !auction) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #94a3b8)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} />
        Loading Live Auction Arena...
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <div style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: 700 }}>
          {error || 'Auction not found'}
        </div>
        <Link to={`/tournaments/${tournamentIdParam || ''}`} style={{ color: 'var(--accent-primary, #10b981)', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Tournament
        </Link>
      </div>
    );
  }

  const currentPlayer = auction.currentPlayer;
  const nextMinBid = currentPlayer ? currentPlayer.nextMinimumBid : 0;
  const nextIncrement = currentPlayer ? currentPlayer.nextIncrement : auction.defaultBidIncrement;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark, #090d16)',
      color: 'var(--text-main, #fff)',
      padding: 'clamp(0.75rem, 2vw, 1.5rem)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Top Bar Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'var(--bg-card-solid, #101929)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        borderRadius: '14px',
        padding: '0.85rem 1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to={`/tournaments/${auction.tournamentId}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted, #94a3b8)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'rgba(255,255,255,0.04)',
              padding: '6px 12px',
              borderRadius: '8px'
            }}
          >
            <ArrowLeft size={16} /> Exit Arena
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', fontWeight: 900, margin: 0, color: 'var(--text-heading, #fff)' }}>
                {auction.name}
              </h1>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '999px',
                background: auction.status === 'LIVE' ? '#ef4444' : auction.status === 'PAUSED' ? '#f59e0b' : '#10b981',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {auction.status}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
              {auction.tournamentName} • Min Squad: {auction.minSquadSize} Players • Reserve Base: ₹{Number(auction.lowestEligibleBasePrice).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Action Controls & Sound */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: 'transparent',
              border: 'none',
              color: soundEnabled ? 'var(--accent-primary, #10b981)' : 'var(--text-dim, #64748b)',
              cursor: 'pointer',
              padding: '6px'
            }}
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {isOperatorOrAdmin && (
            <>
              {auction.status === 'DRAFT' && (
                <button
                  onClick={handleStartAuction}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-primary, #10b981)',
                    border: 'none',
                    color: 'var(--text-on-accent, #022c22)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Play size={16} /> Start Live Auction
                </button>
              )}

              {auction.status === 'LIVE' && (
                <button
                  onClick={handlePauseAuction}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#f59e0b',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Pause size={16} /> Pause Auction
                </button>
              )}

              {auction.status === 'PAUSED' && (
                <button
                  onClick={handleResumeAuction}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--accent-primary, #10b981)',
                    border: 'none',
                    color: 'var(--text-on-accent, #022c22)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Play size={16} /> Resume Auction
                </button>
              )}

              {auction.status !== 'COMPLETED' && (
                <button
                  onClick={handleCompleteAuction}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    color: 'var(--text-secondary, #cbd5e1)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Complete Auction
                </button>
              )}
            </>
          )}

          <button
            onClick={() => setShowReportsModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--accent-secondary, #3b82f6)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <FileText size={16} /> Reports
          </button>
        </div>
      </header>

      {/* Notifications / Error Banner */}
      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: 700
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Grid: Arena Block (Left/Center) + Teams & Wallets (Right) */}
      <div className="auction-main-layout">
        {/* CENTER: THE AUCTION BLOCK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentPlayer ? (
            /* ACTIVE PLAYER CARD ON THE BLOCK */
            <div style={{
              background: 'var(--bg-card-solid, #101929)',
              border: '2px solid var(--border-glow, rgba(16, 185, 129, 0.3))',
              borderRadius: '20px',
              padding: 'clamp(1.25rem, 3vw, 2rem)',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              position: 'relative'
            }}>
              {/* Top Meta & Countdown Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: 'var(--accent-secondary, #3b82f6)',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    LOT #{currentPlayer.lotNumber || '1'}
                  </span>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--accent-primary, #10b981)',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    padding: '4px 12px',
                    borderRadius: '6px'
                  }}>
                    CATEGORY {currentPlayer.categoryName}
                  </span>
                </div>

                {/* Big Live Timer */}
                {timerActive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: timeLeft <= 5 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.15)',
                    border: timeLeft <= 5 ? '1px solid #ef4444' : '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    animation: timeLeft <= 5 ? 'pulse 1s infinite' : 'none'
                  }}>
                    <Clock size={18} color={timeLeft <= 5 ? '#ef4444' : '#f59e0b'} />
                    <span style={{
                      fontSize: '1.2rem',
                      fontWeight: 900,
                      color: timeLeft <= 5 ? '#ef4444' : '#f59e0b'
                    }}>
                      {timeLeft}s
                    </span>
                  </div>
                )}
              </div>

              {/* Player Bio & Profile */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {currentPlayer.profilePhoto ? (
                    <img src={currentPlayer.profilePhoto} alt={currentPlayer.playerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={48} color="var(--accent-primary, #10b981)" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', fontWeight: 900, margin: '0 0 0.35rem 0', color: 'var(--text-heading, #fff)' }}>
                    {currentPlayer.playerName}
                  </h2>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem' }}>
                    <span>Role: <strong style={{ color: '#fff' }}>{currentPlayer.role?.replace('_', ' ')}</strong></span>
                    <span>Batting: <strong style={{ color: '#fff' }}>{currentPlayer.battingStyle}</strong></span>
                    <span>Bowling: <strong style={{ color: '#fff' }}>{currentPlayer.bowlingStyle}</strong></span>
                    {currentPlayer.previousTeam && (
                      <span>Prev Team: <strong style={{ color: '#fff' }}>{currentPlayer.previousTeam}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* CURRENT BID DISPLAY (MASSIVE, ULTRA-PROMINENT FOR PROJECTOR / AUDIENCE) */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(9, 13, 22, 0.9) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '1.75rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-secondary, #3b82f6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                  Base Price: ₹{Number(currentPlayer.basePrice).toLocaleString('en-IN')}
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  CURRENT HIGHEST BID
                </div>

                <div style={{
                  fontSize: 'clamp(2.5rem, 6.5vw, 4.2rem)',
                  fontWeight: 900,
                  color: 'var(--accent-primary, #10b981)',
                  lineHeight: 1.1,
                  margin: '0.35rem 0',
                  textShadow: '0 0 25px rgba(16, 185, 129, 0.4)'
                }}>
                  ₹{Number(currentPlayer.currentBid).toLocaleString('en-IN')}
                </div>

                {currentPlayer.highestBidder ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '8px 18px',
                    borderRadius: '999px',
                    marginTop: '0.5rem'
                  }}>
                    <Shield size={18} color="var(--accent-primary, #10b981)" />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                      Highest Bidder: {currentPlayer.highestBidder.teamName}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    No bids placed yet. Bidding opens at Base Price ₹{Number(currentPlayer.basePrice).toLocaleString('en-IN')}.
                  </div>
                )}
              </div>

              {/* OPERATOR ACTION BUTTONS (Sold, Unsold, Raise Bid) */}
              {isOperatorOrAdmin && (
                <div style={{
                  borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                  paddingTop: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-secondary, #cbd5e1)' }}>
                    Auctioneer / Operator Controls:
                  </div>

                  {/* Accept Bid for Selected Team */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr auto auto', gap: '0.75rem', alignItems: 'center' }}>
                    <select
                      value={operatorBidTeamId}
                      onChange={(e) => setOperatorBidTeamId(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-input, rgba(15,23,42,0.9))',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        borderRadius: '8px',
                        color: '#fff',
                        padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="">-- Select Bidding Team --</option>
                      {auction.teams?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName} (Avail: ₹{Number(t.availableBiddingBudget).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!operatorBidTeamId}
                      onClick={() => handlePlaceBid(operatorBidTeamId, nextMinBid)}
                      style={{
                        background: 'var(--accent-primary, #10b981)',
                        border: 'none',
                        color: 'var(--text-on-accent, #022c22)',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 900,
                        cursor: !operatorBidTeamId ? 'not-allowed' : 'pointer',
                        opacity: !operatorBidTeamId ? 0.6 : 1
                      }}
                    >
                      Accept Bid: ₹{Number(nextMinBid).toLocaleString('en-IN')} (+₹{Number(nextIncrement).toLocaleString('en-IN')})
                    </button>
                  </div>

                  {/* Sold & Unsold Action Row */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleMarkSold}
                      disabled={!currentPlayer.highestBidder}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#022c22',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        cursor: !currentPlayer.highestBidder ? 'not-allowed' : 'pointer',
                        opacity: !currentPlayer.highestBidder ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <CheckCircle size={20} /> MARK SOLD
                    </button>

                    <button
                      onClick={handleMarkUnsold}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <XCircle size={20} /> MARK UNSOLD
                    </button>
                  </div>
                </div>
              )}

              {/* TEAM REPRESENTATIVE 1-TAP BID BUTTON (Mode B or authorized user) */}
              {userTeam && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={18} color="var(--accent-secondary, #3b82f6)" />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                        Your Team: {userTeam.teamName}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#38bdf8' }}>
                      Available Bidding Budget: <strong>₹{Number(userTeam.availableBiddingBudget).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Compulsory Squad Reserve Warning if bid cannot be made */}
                  {nextMinBid > userTeam.availableBiddingBudget ? (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      Bid blocked: Placing this bid (₹{Number(nextMinBid).toLocaleString('en-IN')}) would violate your compulsory squad reserve (₹{Number(userTeam.reservedBudget).toLocaleString('en-IN')} needed for remaining slots).
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlaceBid(userTeam.id, nextMinBid)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '1rem 1.5rem',
                        borderRadius: '10px',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}
                    >
                      <Gavel size={22} /> BID ₹{Number(nextMinBid).toLocaleString('en-IN')} (+₹{Number(nextIncrement).toLocaleString('en-IN')})
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* EMPTY AUCTION STAGE */
            <div style={{
              background: 'var(--bg-card-solid, #101929)',
              border: '1px dashed var(--border-color, rgba(255,255,255,0.15))',
              borderRadius: '20px',
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.25rem'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary, #10b981)'
              }}>
                <Gavel size={36} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading, #fff)' }}>
                  Auction Block is Empty
                </h3>
                <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                  {isOperatorOrAdmin
                    ? 'Select the next available player from the auction pool to bring them onto the auction stage.'
                    : 'The auctioneer will bring the next player to the block shortly.'}
                </p>
              </div>

              {isOperatorOrAdmin && (
                <button
                  onClick={() => {
                    fetchAvailablePlayers();
                    setShowPlayerPicker(true);
                  }}
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
                    cursor: 'pointer'
                  }}
                >
                  <User size={18} /> Select Next Player for Bidding
                </button>
              )}
            </div>
          )}

          {/* Quick Selection Dropdown when picker open */}
          {showPlayerPicker && (
            <div style={{
              background: 'var(--bg-modal, #0f172a)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
              borderRadius: '14px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-card)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Available Players in Pool ({availablePlayers.length})</h4>
                <button onClick={() => setShowPlayerPicker(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              {availablePlayers.length === 0 ? (
                <div style={{ color: 'var(--text-muted, #94a3b8)', padding: '1rem 0' }}>
                  No available players remaining in the pool.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {availablePlayers.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>{p.playerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>
                          {p.categoryName} • Base: ₹{Number(p.basePrice).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBringPlayerOnBlock(p.id)}
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid rgba(16,185,129,0.3)',
                          color: 'var(--accent-primary, #10b981)',
                          padding: '0.4rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Put on Block →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: PARTICIPATING TEAMS & WALLETS SIDEBAR */}
        <div style={{
          background: 'var(--bg-card-solid, #101929)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          borderRadius: '16px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
              Teams & Wallets ({auction.teams?.length || 0})
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>Live Budget Reserve</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {auction.teams?.map((t) => {
              const isHighestBidder = currentPlayer?.highestBidder?.auctionTeamId === t.id;

              return (
                <div
                  key={t.id}
                  style={{
                    background: isHighestBidder ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: isHighestBidder ? '1px solid var(--accent-primary, #10b981)' : '1px solid var(--border-color, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={16} color={isHighestBidder ? 'var(--accent-primary, #10b981)' : '#cbd5e1'} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
                        {t.teamName}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: t.playersPurchased >= t.minSquadSize ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                      color: t.playersPurchased >= t.minSquadSize ? '#34d399' : 'var(--text-muted, #94a3b8)'
                    }}>
                      {t.playersPurchased} / {t.minSquadSize} Compulsory
                    </span>
                  </div>

                  {/* Wallet Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim, #64748b)' }}>Balance: </span>
                      <strong style={{ color: '#fff' }}>₹{Number(t.remainingBalance).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim, #64748b)' }}>Spent: </span>
                      <strong style={{ color: 'var(--accent-primary, #10b981)' }}>₹{Number(t.amountSpent).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim, #64748b)' }}>Reserve: </span>
                      <strong style={{ color: 'var(--accent-amber, #f59e0b)' }}>₹{Number(t.reservedBudget).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim, #64748b)' }}>Available: </span>
                      <strong style={{ color: '#38bdf8' }}>₹{Number(t.availableBiddingBudget).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reports Modal */}
      <AuctionReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        auctionId={auction.id}
      />
    </div>
  );
};

export default LiveAuctionPage;
