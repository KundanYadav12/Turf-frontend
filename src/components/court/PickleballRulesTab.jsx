'use client';
import React, { useMemo } from 'react';
import {
  BookOpen, ShieldCheck, Zap, ArrowRight, UserCheck, CheckCircle2,
  AlertCircle, RefreshCw, LayoutGrid, Award, Info
} from 'lucide-react';

/**
 * Dedicated, comprehensive Rules tab for Pickleball Tournaments and Scorer views.
 * Adheres strictly to Section 7: Sections A, B, C, D, and E with live state readouts.
 */
export default function PickleballRulesTab({
  rules = {},
  scores = { teamA: 0, teamB: 0 },
  sportState = null,
  courtState = null,
  teamA = { name: 'Team A' },
  teamB = { name: 'Team B' },
  lineup = { teamA: [], teamB: [] },
  status = 'LIVE',
  theme = 'dark'
}) {
  const matchFormat = (rules.matchFormat || 'DOUBLES').toUpperCase();
  const isDoubles = matchFormat !== 'SINGLES';
  const scoringMode = (rules.scoringMode || sportState?.scoringMode || 'RALLY').toUpperCase();
  const isRally = scoringMode === 'RALLY';
  const targetScore = rules.targetScore != null ? rules.targetScore : 15;
  const winByTwo = rules.winByTwo !== false;
  const maxScore = rules.maxScore || null;

  const scoreA = scores?.teamA ?? 0;
  const scoreB = scores?.teamB ?? 0;

  // Determine current serving team & court
  const servingTeamKey = sportState?.servingTeam || courtState?.servingTeam || 'teamA';
  const isTeamAServing = servingTeamKey === 'teamA';
  const servingTeamName = isTeamAServing ? (teamA.name || 'Team A') : (teamB.name || 'Team B');
  const servingScore = isTeamAServing ? scoreA : scoreB;
  const isServingEven = servingScore % 2 === 0;

  const serviceCourt = sportState?.serviceCourt || courtState?.serviceCourt || (isServingEven ? 'RIGHT' : 'LEFT');
  const activeServerName = sportState?.activeServerName || courtState?.activeServerName || (isTeamAServing ? `${teamA.name} 1` : `${teamB.name} 1`);
  const activeReceiverName = sportState?.activeReceiverName || courtState?.activeReceiverName || (!isTeamAServing ? `${teamA.name} 1` : `${teamB.name} 1`);

  // Player positions from state
  const locations = sportState?.playerLocations || courtState?.playerLocations || {};

  const rawA = Array.isArray(lineup.teamA) ? lineup.teamA : [];
  const rawB = Array.isArray(lineup.teamB) ? lineup.teamB : [];
  const pA1 = typeof rawA[0] === 'string' ? rawA[0] : (rawA[0]?.name || `${teamA.name || 'Team A'} 1`);
  const pA2 = typeof rawA[1] === 'string' ? rawA[1] : (rawA[1]?.name || `${teamA.name || 'Team A'} 2`);
  const pB1 = typeof rawB[0] === 'string' ? rawB[0] : (rawB[0]?.name || `${teamB.name || 'Team B'} 1`);
  const pB2 = typeof rawB[1] === 'string' ? rawB[1] : (rawB[1]?.name || `${teamB.name || 'Team B'} 2`);

  const pA1Id = typeof rawA[0] === 'object' ? (rawA[0]?._id || rawA[0]?.id) : null;
  const pA2Id = typeof rawA[1] === 'object' ? (rawA[1]?._id || rawA[1]?.id) : null;
  const pB1Id = typeof rawB[0] === 'object' ? (rawB[0]?._id || rawB[0]?.id) : null;
  const pB2Id = typeof rawB[1] === 'object' ? (rawB[1]?._id || rawB[1]?.id) : null;

  const servePoints = sportState?.servePoints || courtState?.servePoints || null;
  const spA = servePoints?.teamA ?? (isRally ? 0 : scoreA);
  const spB = servePoints?.teamB ?? (isRally ? 0 : scoreB);

  const pA1Pos = (pA1Id && locations[pA1Id]) || locations[pA1] || (spA % 2 === 0 ? 'RIGHT' : 'LEFT');
  const pA2Pos = (pA2Id && locations[pA2Id]) || locations[pA2] || (pA1Pos === 'RIGHT' ? 'LEFT' : 'RIGHT');
  const pB1Pos = (pB1Id && locations[pB1Id]) || locations[pB1] || (spB % 2 === 0 ? 'RIGHT' : 'LEFT');
  const pB2Pos = (pB2Id && locations[pB2Id]) || locations[pB2] || (pB1Pos === 'RIGHT' ? 'LEFT' : 'RIGHT');

  const cardStyle = {
    background: 'var(--bg-card, rgba(15, 23, 42, 0.75))',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
    borderRadius: '14px',
    padding: '1.25rem',
    marginBottom: '1rem',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.15)'
  };

  const badgeStyle = (bgColor, textColor) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.25rem 0.65rem',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    backgroundColor: bgColor,
    color: textColor,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  });

  return (
    <div className="pickleball-rules-tab-root" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner */}
      <div
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
              Tournament Rules & Match Mechanics
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
              Active rules configured for this tournament: {isRally ? 'Rally Scoring (15 Pts)' : 'Traditional Side-Out'} &bull; {matchFormat}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={badgeStyle('rgba(16, 185, 129, 0.2)', '#34d399')}>
            <Zap size={13} /> {isRally ? 'Rally Scoring' : 'Side-Out'}
          </span>
          <span style={badgeStyle('rgba(59, 130, 246, 0.2)', '#60a5fa')}>
            <Award size={13} /> Target: {targetScore} Pts
          </span>
          {winByTwo && (
            <span style={badgeStyle('rgba(245, 158, 11, 0.2)', '#fbbf24')}>
              <CheckCircle2 size={13} /> Win by 2
            </span>
          )}
        </div>
      </div>

      {/* SECTION E: CURRENT LIVE MATCH STATE SUMMARY */}
      <div
        style={{
          ...cardStyle,
          border: '1.5px solid rgba(16, 185, 129, 0.4)',
          background: 'rgba(16, 185, 129, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981'
              }}
            />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Section E &bull; Live Match State Summary
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
            Status: <strong style={{ color: status === 'LIVE' ? '#10b981' : '#f59e0b' }}>{status}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-elevated, rgba(30, 41, 59, 0.6))', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Current Score</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main, #f8fafc)', marginTop: '0.2rem' }}>
              {teamA.name}: <span style={{ color: '#10b981' }}>{scoreA}</span> &bull; {teamB.name}: <span style={{ color: '#3b82f6' }}>{scoreB}</span>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-elevated, rgba(30, 41, 59, 0.6))', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Serving Team</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isTeamAServing ? '#10b981' : '#3b82f6', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={16} /> {servingTeamName} ({servingScore} pts)
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-elevated, rgba(30, 41, 59, 0.6))', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Active Server & Box</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)', marginTop: '0.3rem' }}>
              {activeServerName} &bull; <span style={{ color: '#fbbf24' }}>{serviceCourt} BOX</span>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-elevated, rgba(30, 41, 59, 0.6))', border: '1px solid var(--border-color, rgba(255,255,255,0.06))' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Diagonal Receiver</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)', marginTop: '0.3rem' }}>
              {activeReceiverName} &bull; <span style={{ color: '#93c5fd' }}>{serviceCourt} BOX</span>
            </div>
          </div>
        </div>

        {/* Live Player Positions on Court */}
        {isDoubles && (
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem 1rem', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#34d399', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Player Court Positions (Live Placement):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.82rem' }}>{teamA.name}:</span>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-main, #f8fafc)' }}>
                  &bull; <strong>{pA1}</strong>: <span style={{ color: pA1Pos === 'RIGHT' ? '#34d399' : '#fbbf24' }}>{pA1Pos} Box</span>
                  <br />
                  &bull; <strong>{pA2}</strong>: <span style={{ color: pA2Pos === 'RIGHT' ? '#34d399' : '#fbbf24' }}>{pA2Pos} Box</span>
                </div>
              </div>

              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <span style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.82rem' }}>{teamB.name}:</span>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem', color: 'var(--text-main, #f8fafc)' }}>
                  &bull; <strong>{pB1}</strong>: <span style={{ color: pB1Pos === 'RIGHT' ? '#34d399' : '#fbbf24' }}>{pB1Pos} Box</span>
                  <br />
                  &bull; <strong>{pB2}</strong>: <span style={{ color: pB2Pos === 'RIGHT' ? '#34d399' : '#fbbf24' }}>{pB2Pos} Box</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION A: SCORING FORMAT */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <Zap size={18} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
            Section A &bull; Scoring Format: {isRally ? `Rally Scoring — ${targetScore} Points` : 'Traditional Side-Out Scoring'}
          </h3>
        </div>

        {isRally ? (
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            <p style={{ marginTop: 0 }}>
              This tournament uses <strong>Rally Scoring to {targetScore} Points</strong>. In rally scoring, points are awarded on <em>every single rally</em>:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li><strong>Point on Every Rally:</strong> The team winning the rally scores 1 point, regardless of who served prior to the rally.</li>
              <li><strong>Rally Winner Serves:</strong> The team that wins the rally earns the right to serve the next rally.</li>
              <li><strong>Target Score:</strong> First team to reach <strong>{targetScore} points</strong> {winByTwo ? 'with a 2-point lead' : ''} wins the match.</li>
              {maxScore && (
                <li><strong>Hard Cap:</strong> First team to reach <strong>{maxScore} points</strong> wins immediately regardless of margin.</li>
              )}
            </ul>
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.8rem', color: '#93c5fd' }}>
              <Info size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              <strong>Important distinction:</strong> In standard side-out pickleball, only the serving team can score. In this tournament’s Rally Scoring mode, receivers score a point immediately upon winning a rally!
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
            <p style={{ marginTop: 0 }}>
              This match is configured for <strong>Traditional Side-Out Scoring</strong>.
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
              <li>Only the serving team can score points upon winning a rally.</li>
              <li>If the receiving team wins a rally, no points are awarded; the serve transitions to Server #2 or triggers a side-out.</li>
              <li>Target score is {targetScore} points {winByTwo ? '(win by 2)' : ''}.</li>
            </ul>
          </div>
        )}
      </div>

      {/* SECTION B: SERVICE-BOX RULE */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <LayoutGrid size={18} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
            Section B &bull; Left/Right Service-Box Rules
          </h3>
        </div>

        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>
            The active service box is calculated strictly from the <strong>serving team's own authoritative score</strong>:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', margin: '0.75rem 0' }}>
            <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontWeight: 800, color: '#34d399', fontSize: '0.85rem' }}>EVEN SCORE &rarr; RIGHT BOX</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '0.25rem' }}>
                Scores: 0, 2, 4, 6, 8, 10, 12, 14, 16...
                <br />
                The server must serve diagonally from the <strong>Right service court</strong>.
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '0.85rem' }}>ODD SCORE &rarr; LEFT BOX</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '0.25rem' }}>
                Scores: 1, 3, 5, 7, 9, 11, 13, 15, 17...
                <br />
                The server must serve diagonally from the <strong>Left service court</strong>.
              </div>
            </div>
          </div>

          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-elevated, rgba(30, 41, 59, 0.5))', border: '1px solid var(--border-color, rgba(255,255,255,0.06))', fontSize: '0.82rem' }}>
            <strong>Current Live Calculation Example:</strong>
            <br />
            {isTeamAServing ? (
              <span>
                {teamA.name} is currently serving with <strong>{scoreA} points</strong> ({scoreA % 2 === 0 ? 'EVEN' : 'ODD'}).
                Therefore, {teamA.name} serves from the <strong>{scoreA % 2 === 0 ? 'RIGHT' : 'LEFT'} service box</strong>.
              </span>
            ) : (
              <span>
                {teamB.name} is currently serving with <strong>{scoreB} points</strong> ({scoreB % 2 === 0 ? 'EVEN' : 'ODD'}).
                Therefore, {teamB.name} serves from the <strong>{scoreB % 2 === 0 ? 'RIGHT' : 'LEFT'} service box</strong>.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION C: DOUBLES PLAYER SWITCHING */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <RefreshCw size={18} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
            Section C &bull; Doubles Partner Switching & Odd/Even Rule
          </h3>
        </div>

        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>
            In this tournament format, doubles partners switch sides strictly according to rally scoring swap rules:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
            <li><strong>Serving team wins the rally:</strong> ONLY the serving team's two players swap sides. The same player keeps serving from the new court. The receiving team does NOT swap.</li>
            <li><strong>Receiving team wins the rally:</strong> NO player on either team swaps. Everyone stays where they are. The winning team becomes the serving team, and the server is the player standing in the court matching that team's score parity (Even &rarr; Right court, Odd &rarr; Left court).</li>
            <li><strong>Never swap players of a team that scored while receiving:</strong> E.g. When {teamB?.name || 'Mumbai Warriors'} (or any receiving team) wins a rally while receiving, NO player on either team swaps.</li>
            <li><strong>Stable Identity:</strong> Player 1 (P1) and Player 2 (P2) maintain their immutable starting identities (P1 started Right, P2 started Left) throughout the entire match.</li>
            <li><strong>State &amp; Idempotency:</strong> Positions are derived strictly from each team's count of points won while serving (Even &rarr; original sides, Odd &rarr; swapped). Points won while receiving never count toward swaps.</li>
          </ul>

          <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                  <th style={{ padding: '6px 10px' }}>Rally Event</th>
                  <th style={{ padding: '6px 10px' }}>{teamA?.name || 'Team A'}</th>
                  <th style={{ padding: '6px 10px' }}>{teamB?.name || 'Team B'}</th>
                  <th style={{ padding: '6px 10px' }}>Serving Team</th>
                  <th style={{ padding: '6px 10px' }}>{teamA?.name ? `${teamA.name} Positions` : 'Team A Positions'}</th>
                  <th style={{ padding: '6px 10px' }}>{teamB?.name ? `${teamB.name} Positions` : 'Team B Positions'}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 10px' }}>Match Start</td>
                  <td style={{ padding: '6px 10px' }}>0</td>
                  <td style={{ padding: '6px 10px' }}>0</td>
                  <td style={{ padding: '6px 10px', color: '#10b981', fontWeight: 700 }}>{teamA?.name || 'Team A'} (Right Box)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 10px' }}>{teamA?.name || 'Team A'} wins rally (Serving team scores)</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>1</td>
                  <td style={{ padding: '6px 10px' }}>0</td>
                  <td style={{ padding: '6px 10px', color: '#10b981', fontWeight: 700 }}>{teamA?.name || 'Team A'} (Left Box)</td>
                  <td style={{ padding: '6px 10px', color: '#fbbf24' }}>P1 Left, P2 Right (Swapped)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left (No swap)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 10px' }}>{teamA?.name || 'Team A'} wins rally (Serving team scores)</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>2</td>
                  <td style={{ padding: '6px 10px' }}>0</td>
                  <td style={{ padding: '6px 10px', color: '#10b981', fontWeight: 700 }}>{teamA?.name || 'Team A'} (Right Box)</td>
                  <td style={{ padding: '6px 10px', color: '#34d399' }}>P1 Right, P2 Left (Returned)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left (No swap)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(59, 130, 246, 0.08)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>{teamB?.name || 'Team B'} wins rally (Receiving team scores &bull; Turnover)</td>
                  <td style={{ padding: '6px 10px' }}>2</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#60a5fa' }}>1</td>
                  <td style={{ padding: '6px 10px', color: '#60a5fa', fontWeight: 700 }}>{teamB?.name || 'Team B'} (Left Box)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left (No swap)</td>
                  <td style={{ padding: '6px 10px', color: '#34d399', fontWeight: 700 }}>P1 Right, P2 Left (NO SWAP - Won while receiving)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '6px 10px' }}>{teamB?.name || 'Team B'} wins rally (Serving team scores)</td>
                  <td style={{ padding: '6px 10px' }}>2</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#60a5fa' }}>2</td>
                  <td style={{ padding: '6px 10px', color: '#60a5fa', fontWeight: 700 }}>{teamB?.name || 'Team B'} (Right Box)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Right, P2 Left (No swap)</td>
                  <td style={{ padding: '6px 10px', color: '#fbbf24' }}>P1 Left, P2 Right (Swapped - Won while serving)</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px' }}>{teamA?.name || 'Team A'} wins rally (Receiving team scores &bull; Turnover)</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#10b981' }}>3</td>
                  <td style={{ padding: '6px 10px' }}>2</td>
                  <td style={{ padding: '6px 10px', color: '#10b981', fontWeight: 700 }}>{teamA?.name || 'Team A'} (Left Box)</td>
                  <td style={{ padding: '6px 10px', color: '#34d399', fontWeight: 700 }}>P1 Right, P2 Left (NO SWAP - Won while receiving)</td>
                  <td style={{ padding: '6px 10px' }}>P1 Left, P2 Right (No swap)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION D: SERVER RULE */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
          <UserCheck size={18} color="#fbbf24" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
            Section D &bull; Server Selection Rule
          </h3>
        </div>

        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>
            Under this tournament’s rally-scoring mode:
          </p>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
            <li>The winner of the previous rally becomes the next serving team.</li>
            <li>The serving team's score determines whether the serve originates from the Right or Left service court.</li>
            <li>The <strong>registered player standing in the active service court</strong> is the active server for that rally.</li>
            <li>There is no secondary server (Server #2) turn in this rally scoring mode — every rally point immediately determines the next server.</li>
          </ul>

          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.82rem', color: '#fde68a' }}>
            <strong>Active Server for Next Rally:</strong> {activeServerName} serving from the <strong>{serviceCourt} Box</strong> for {servingTeamName}.
          </div>
        </div>
      </div>
    </div>
  );
}
