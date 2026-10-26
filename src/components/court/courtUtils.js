/**
 * Single Authoritative Source of Truth for Racquet Sports (Badminton, Pickleball, Tennis).
 * Derives all court geometry, player positions, serving rules, and score formats.
 * Backed by the pure, testable courtRulesEngine adapter system.
 */

import {
  COURT_BOXES,
  BOX_COORDINATES,
  PLAYER_REST_COORDINATES,
  BOX_RECTS,
  getScreenBox,
  getDiagonalReceiverBox,
  extractInitials,
  calculatePickleballDoublesPositions,
  PickleballAdapter,
  BadmintonAdapter,
  FallbackAdapter,
  getSportAdapter,
  getInitialCourtState,
  applyPointToCourtState,
  computeCourtStateFromHistory,
  finalizeCourtState
} from './courtRulesEngine.js';

export {
  COURT_BOXES,
  BOX_COORDINATES,
  PLAYER_REST_COORDINATES,
  BOX_RECTS,
  getScreenBox,
  getDiagonalReceiverBox,
  extractInitials,
  calculatePickleballDoublesPositions,
  PickleballAdapter,
  BadmintonAdapter,
  FallbackAdapter,
  getSportAdapter,
  getInitialCourtState,
  applyPointToCourtState,
  computeCourtStateFromHistory,
  finalizeCourtState
};

/**
 * Authoritative Pure Function for Badminton (and Racquet) Serve State.
 * Computes:
 * - serverTeam, serverSide ('left' | 'right' on screen), serviceBox ('top' | 'bottom')
 * - receiverTeam, receiverSide ('left' | 'right'), targetBox: { side, box }
 * - label: "Serving: [Team] ([Box] Box) → Target: [Team] ([Box] Box)"
 *
 * Adheres strictly to BWF service rules:
 * - Score EVEN -> serve from RIGHT service court (player's perspective).
 * - Score ODD -> serve from LEFT service court (player's perspective).
 * - Serve is always DIAGONAL cross-court.
 * - Team on left half faces right: right court is BOTTOM on screen, left court is TOP.
 * - Team on right half faces left: right court is TOP on screen, left court is BOTTOM.
 */
export function getServeState(match) {
  if (!match) {
    return {
      sport: 'badminton',
      serverTeam: { id: 'A', name: 'Team A' },
      serverTeamName: 'Team A',
      serverSide: 'left',
      serviceBox: 'bottom',
      receiverTeam: { id: 'B', name: 'Team B' },
      receiverTeamName: 'Team B',
      receiverSide: 'right',
      targetBox: { side: 'right', box: 'top' },
      label: 'Serving: Team A (RIGHT Box) → Target: Team B (LEFT Box)',
      serverScore: 0,
      receiverScore: 0,
      serverCourt: 'RIGHT',
      receiverCourt: 'LEFT',
      servingBoxName: 'bottom-left',
      targetBoxName: 'top-right',
      teamSides: { teamA: 'left', teamB: 'right' },
      isTeamAServing: true,
      scoreA: 0,
      scoreB: 0,
      currentGame: 1,
      eventSeq: 1
    };
  }

  // 1. Sport
  const sport = (match.sportSlug || match.sport?.slug || match.sport || 'badminton').toLowerCase();

  // 2. Extract underlying state
  let state = match.score?.details || match.sport_state || match.state || {};
  if (typeof state === 'string') {
    try {
      state = JSON.parse(state);
    } catch {
      state = {};
    }
  }

  // 3. Team identity
  const teamA = match.teamA || {
    id: match.team_a_id || 'A',
    name: match.team_a_name || match.teamAName || 'Team A',
    logo: match.team_a_logo || null
  };
  const teamB = match.teamB || {
    id: match.team_b_id || 'B',
    name: match.team_b_name || match.teamBName || 'Team B',
    logo: match.team_b_logo || null
  };

  // 4. Scores
  let scoreA = 0;
  let scoreB = 0;
  let currentGame = state.currentGame || match.currentGame || 1;

  if (state.gameScores && Array.isArray(state.gameScores) && state.gameScores.length > 0) {
    const curIdx = Math.max(0, currentGame - 1);
    const curGame = state.gameScores[curIdx] || state.gameScores[0];
    scoreA = curGame.teamA != null ? curGame.teamA : 0;
    scoreB = curGame.teamB != null ? curGame.teamB : 0;
  } else if (match.scores) {
    scoreA = match.scores.teamA ?? 0;
    scoreB = match.scores.teamB ?? 0;
  } else if (match.scoreA !== undefined || match.scoreB !== undefined) {
    scoreA = match.scoreA ?? 0;
    scoreB = match.scoreB ?? 0;
  } else if (typeof match.live_score_summary === 'string' || typeof match.score?.summary === 'string') {
    const sum = match.live_score_summary || match.score?.summary || '';
    const parenMatch = sum.match(/\((?:G\d+:\s*)?(\d+)\s*[-:]\s*(\d+)\)/i);
    if (parenMatch) {
      scoreA = parseInt(parenMatch[1], 10);
      scoreB = parseInt(parenMatch[2], 10);
    } else {
      const allMatches = [...sum.matchAll(/(\d+)\s*[-:]\s*(\d+)/g)];
      if (allMatches.length > 0) {
        const last = allMatches[allMatches.length - 1];
        scoreA = parseInt(last[1], 10);
        scoreB = parseInt(last[2], 10);
      }
    }
  }

  // 5. Server selection (Team A vs Team B)
  let servingTeamKey = null; // 'teamA' | 'teamB'

  if (match.servingTeam) {
    const st = String(match.servingTeam).toLowerCase();
    if (st === 'teamb' || st === 'team_b' || st === 'b') servingTeamKey = 'teamB';
    else if (st === 'teama' || st === 'team_a' || st === 'a') servingTeamKey = 'teamA';
  } else if (state.servingTeam) {
    const st = String(state.servingTeam).toLowerCase();
    if (st === 'teamb' || st === 'team_b' || st === 'b') servingTeamKey = 'teamB';
    else if (st === 'teama' || st === 'team_a' || st === 'a') servingTeamKey = 'teamA';
  } else if (state.currentServer || state.serverSide) {
    const cs = String(state.currentServer || state.serverSide).toUpperCase();
    if (cs === 'B') servingTeamKey = 'teamB';
    else if (cs === 'A') servingTeamKey = 'teamA';
  } else if (match.servingSide) {
    const ss = String(match.servingSide).toLowerCase();
    if (ss === 'team_b' || ss === 'b') servingTeamKey = 'teamB';
    else if (ss === 'team_a' || ss === 'a') servingTeamKey = 'teamA';
  } else {
    // Check live subtext (e.g. "Serving: Ace Smashers (LEFT)")
    const subtext = (match.score?.subtext || match.live_subtext || match.liveSubtext || '').toLowerCase();
    if (subtext.includes('serving:')) {
      const bName = (teamB.name || '').toLowerCase();
      const aName = (teamA.name || '').toLowerCase();
      if (bName && subtext.includes(bName)) servingTeamKey = 'teamB';
      else if (aName && subtext.includes(aName)) servingTeamKey = 'teamA';
    }
  }

  if (!servingTeamKey) {
    if (match.serverSide) {
      const ss = String(match.serverSide).toLowerCase();
      servingTeamKey = ss === 'right' ? 'teamB' : 'teamA';
    } else {
      servingTeamKey = 'teamA';
    }
  }

  const isTeamAServing = servingTeamKey === 'teamA';

  // 6. Screen Team Sides ('left' | 'right')
  let teamASide = 'left';
  let teamBSide = 'right';

  if (match.teamSides) {
    teamASide = String(match.teamSides.teamA || match.teamSides.A || 'left').toLowerCase();
    teamBSide = String(match.teamSides.teamB || match.teamSides.B || 'right').toLowerCase();
  } else if (match.switchEnds === true || match.rules?.switchEnds === true) {
    // BWF change of ends rule when explicitly enabled
    if (currentGame === 2) {
      teamASide = 'right';
      teamBSide = 'left';
    } else if (currentGame >= 3) {
      const leader = Math.max(scoreA, scoreB);
      if (leader >= 11) {
        teamASide = 'right';
        teamBSide = 'left';
      } else {
        teamASide = 'left';
        teamBSide = 'right';
      }
    }
  }

  // Allow explicit serverSide override for testing (e.g. { serverSide: 'left', score: 13 })
  let serverSide = isTeamAServing ? teamASide : teamBSide;
  if (match.serverSide && (match.serverSide.toLowerCase() === 'left' || match.serverSide.toLowerCase() === 'right')) {
    serverSide = match.serverSide.toLowerCase();
  }

  const receiverSide = serverSide === 'left' ? 'right' : 'left';

  // 7. Server & Receiver Scores
  let serverScore = isTeamAServing ? scoreA : scoreB;
  let receiverScore = isTeamAServing ? scoreB : scoreA;
  if (typeof match.serverScore === 'number') {
    serverScore = match.serverScore;
  } else if (typeof match.score === 'number' && match.scoreA === undefined) {
    serverScore = match.score;
  }
  if (match.receiverScore !== undefined) {
    receiverScore = match.receiverScore;
  }

  // 8. BWF Service Court Parity (Player perspective)
  // Even -> RIGHT, Odd -> LEFT
  const isEven = serverScore % 2 === 0;
  const serverCourt = isEven ? 'RIGHT' : 'LEFT';
  const receiverCourt = isEven ? 'LEFT' : 'RIGHT'; // diagonal cross-court

  // 9. Screen Service Box Mapping (Facing Net)
  let serviceBox = 'bottom'; // 'top' | 'bottom'
  if (serverSide === 'left') {
    serviceBox = isEven ? 'bottom' : 'top';
  } else {
    serviceBox = isEven ? 'top' : 'bottom';
  }

  // 10. Screen Target Box Mapping (Diagonal Cross-Court)
  let targetBoxChoice = serviceBox === 'top' ? 'bottom' : 'top';

  const targetBox = {
    side: receiverSide,
    box: targetBoxChoice
  };

  const servingBoxName = `${serviceBox}-${serverSide}`;
  const targetBoxName = `${targetBox.box}-${targetBox.side}`;

  const serverTeam = isTeamAServing ? teamA : teamB;
  const receiverTeam = isTeamAServing ? teamB : teamA;
  const serverTeamName = serverTeam.name || (isTeamAServing ? 'Team A' : 'Team B');
  const receiverTeamName = receiverTeam.name || (isTeamAServing ? 'Team B' : 'Team A');

  const label = `Serving: ${serverTeamName} (${serverCourt} Box) → Target: ${receiverTeamName} (${receiverCourt} Box)`;

  return {
    sport,
    serverTeam,
    serverTeamName,
    serverSide, // 'left' | 'right'
    serviceBox, // 'top' | 'bottom'
    receiverTeam,
    receiverTeamName,
    receiverSide, // 'left' | 'right'
    targetBox, // { side: 'left'|'right', box: 'top'|'bottom' }
    label,
    serverScore,
    receiverScore,
    serverCourt, // 'RIGHT' | 'LEFT'
    receiverCourt, // 'LEFT' | 'RIGHT'
    servingBoxName, // 'bottom-left' | 'top-left' | 'top-right' | 'bottom-right'
    targetBoxName, // 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
    teamSides: { teamA: teamASide, teamB: teamBSide },
    isTeamAServing,
    scoreA,
    scoreB,
    currentGame,
    eventSeq: match?._eventSeq || state.eventSeq || 1
  };
}

/**
 * Authoritative Single Source of Truth for Court State.
 * Reconciles match logs with the pure rules engine to produce deterministic player positions,
 * badges, serving states, scores, and graphics.
 */
export function getCourtState(match) {
  const serveState = match?.serveState || getServeState(match);

  // 1. Sport and format
  const sport = serveState.sport || 'pickleball';
  const isBadminton = sport === 'badminton';
  const isPickleball = sport === 'pickleball';
  const format = (match?.matchFormat || match?.format || match?.rules?.matchFormat || 'DOUBLES').toUpperCase();
  const isSingles = format === 'SINGLES';

  // 2. Extract underlying state and raw text
  let state = match?.score?.details || match?.sport_state || match?.state || {};
  if (typeof state === 'string') {
    try {
      state = JSON.parse(state);
    } catch {
      state = {};
    }
  }

  const summaryRaw = (match?.score?.summary || match?.live_score_summary || match?.scoreSummary || '').trim();

  // 3. Scores and Games
  const scoreA = serveState.scoreA;
  const scoreB = serveState.scoreB;
  const currentGame = serveState.currentGame;
  const gamesWonA = state.gamesWonA != null ? state.gamesWonA : (match?.teamAScore ?? match?.team_a_score ?? 0);
  const gamesWonB = state.gamesWonB != null ? state.gamesWonB : (match?.teamBScore ?? match?.team_b_score ?? 0);
  const mainScoreText = `${scoreA} - ${scoreB}`;
  let gamesWonText = '';

  if (state.gameScores && Array.isArray(state.gameScores) && state.gameScores.length > 0) {
    const curIdx = Math.max(0, currentGame - 1);
    const completed = state.gameScores
      .filter((g, i) => i < curIdx && g.winner)
      .map(g => `${g.teamA}-${g.teamB}`);
    const completedStr = completed.length > 0 ? ` (${completed.join(', ')})` : '';
    gamesWonText = `GAME ${currentGame} • SETS: ${gamesWonA} - ${gamesWonB}${completedStr}`;
  } else {
    gamesWonText = `GAME ${currentGame}`;
  }

  // 4. Team Identity & Player Lineup Extraction
  const lineupRawA = match?.lineup?.teamA || state?.lineup?.teamA || match?.lineupA || [];
  const lineupRawB = match?.lineup?.teamB || state?.lineup?.teamB || match?.lineupB || [];

  const teamA = {
    id: match?.teamA?.id || match?.team_a_id || 'teamA',
    name: match?.teamA?.name || match?.team_a_name || 'Team A',
    logo: match?.teamA?.logo || match?.team_a_logo || null,
    score: scoreA,
    isServing: serveState.isTeamAServing,
    side: (serveState.teamSides.teamA || 'left').toUpperCase()
  };

  const teamB = {
    id: match?.teamB?.id || match?.team_b_id || 'teamB',
    name: match?.teamB?.name || match?.team_b_name || 'Team B',
    logo: match?.teamB?.logo || match?.team_b_logo || null,
    score: scoreB,
    isServing: !serveState.isTeamAServing,
    side: (serveState.teamSides.teamB || 'right').toUpperCase()
  };

  // 5. Config object for Rules Engine
  const engineConfig = {
    sport,
    format,
    scoringMode: match?.scoringMode || match?.rules?.scoringMode || (isPickleball ? 'SIDE_OUT' : 'RALLY'),
    teamA,
    teamB,
    scores: { teamA: scoreA, teamB: scoreB },
    lineup: {
      teamA: lineupRawA,
      teamB: lineupRawB
    },
    targetScore: match?.targetScore || match?.rules?.targetScore || (isBadminton ? 21 : 15),
    winByTwo: match?.winByTwo ?? match?.rules?.winByTwo ?? true,
    startingServingTeam: serveState.isTeamAServing ? 'teamA' : 'teamB'
  };

  // 6. Check for Point History Logs
  const historyLogs = match?.logs || match?.score_logs || state?.logs || [];
  let engineState = null;

  if (Array.isArray(historyLogs) && historyLogs.length > 0) {
    // Deterministic recomputation from full point history
    engineState = computeCourtStateFromHistory(engineConfig, historyLogs);
  } else {
    // Snapshot initialization with current score
    engineConfig.scores = { teamA: scoreA, teamB: scoreB };
    engineState = getInitialCourtState(engineConfig);
    engineState.scores.teamA = scoreA;
    engineState.scores.teamB = scoreB;
    engineState.scoreA = scoreA;
    engineState.scoreB = scoreB;

    if (isPickleball) {
      if (!isSingles) {
        const originalA = engineState.originalPlayerPositions?.teamA || {
          [engineState.playersA[0].id]: 'RIGHT',
          [engineState.playersA[1].id]: 'LEFT'
        };
        const originalB = engineState.originalPlayerPositions?.teamB || {
          [engineState.playersB[0].id]: 'RIGHT',
          [engineState.playersB[1].id]: 'LEFT'
        };
        const posA = calculatePickleballDoublesPositions(scoreA, originalA);
        const posB = calculatePickleballDoublesPositions(scoreB, originalB);
        engineState.playerLocations = { ...engineState.playerLocations, ...posA, ...posB };
      } else {
        engineState.playerLocations[engineState.playersA[0].id] = (scoreA % 2 === 0) ? 'RIGHT' : 'LEFT';
        engineState.playerLocations[engineState.playersB[0].id] = (scoreB % 2 === 0) ? 'RIGHT' : 'LEFT';
      }
      const adapter = getSportAdapter('pickleball');
      engineState = finalizeCourtState(engineState, adapter, engineConfig);
    }
  }

  // 7. Server Number for Pickleball (1 or 2)
  let serverNumber = engineState.serverNumber || state.serverNumber || 1;
  if (isPickleball && summaryRaw) {
    const parts = summaryRaw.split('-');
    if (parts.length === 3) {
      serverNumber = parseInt(parts[2].trim(), 10) || serverNumber;
    }
  }

  // 8. Screen Team Alignment
  const leftTeam = teamA.side === 'LEFT' ? teamA : teamB;
  const rightTeam = teamA.side === 'LEFT' ? teamB : teamA;
  const leftScore = leftTeam.score;
  const rightScore = rightTeam.score;
  const leftIsServing = serveState.serverSide === 'left';
  const rightIsServing = serveState.serverSide === 'right';

  const servingTeam = serveState.isTeamAServing ? 'teamA' : 'teamB';
  const servingSide = serveState.isTeamAServing ? 'team_a' : 'team_b';
  const serverBox = serveState.serverCourt;
  const receiverBox = serveState.receiverCourt;
  const teamSides = {
    teamA: teamA.side,
    teamB: teamB.side
  };
  const servingTeamSide = serveState.serverSide.toUpperCase();
  const receivingTeamSide = serveState.receiverSide.toUpperCase();

  // 9. Coordinates on 800x400 SVG Court ViewBox
  const servingBoxName = serveState.servingBoxName || engineState.servingBoxName || 'bottom-left';
  const targetBoxName = serveState.targetBoxName || engineState.targetBoxName || 'top-right';

  const serverCoords = BOX_COORDINATES[servingBoxName] || { x: 75, y: 285 };
  const receiverCoords = BOX_COORDINATES[targetBoxName] || { x: 725, y: 115 };

  const defaultBallCoords = {
    x: serveState.serverSide === 'left' ? 95 : 705,
    y: serverCoords.y
  };

  // 10. Engine-Derived Players with Accurate Lineup / TBA Status
  const players = engineState.players && engineState.players.length > 0
    ? engineState.players
    : [
        {
          id: 'A1',
          name: teamA.name,
          secondaryLabel: 'Lineup TBA',
          team: 'teamA',
          side: 'LEFT',
          court: 'RIGHT',
          boxName: 'bottom-left',
          x: 75,
          y: 285,
          isServer: leftIsServing && serverBox === 'RIGHT',
          isReceiver: !leftIsServing && receiverBox === 'RIGHT',
          initials: extractInitials(teamA.name, 'A1')
        },
        {
          id: 'A2',
          name: teamA.name,
          secondaryLabel: 'Lineup TBA',
          team: 'teamA',
          side: 'LEFT',
          court: 'LEFT',
          boxName: 'top-left',
          x: 75,
          y: 115,
          isServer: leftIsServing && serverBox === 'LEFT',
          isReceiver: !leftIsServing && receiverBox === 'LEFT',
          initials: extractInitials(teamA.name, 'A2')
        },
        {
          id: 'B1',
          name: teamB.name,
          secondaryLabel: 'Lineup TBA',
          team: 'teamB',
          side: 'RIGHT',
          court: 'RIGHT',
          boxName: 'top-right',
          x: 725,
          y: 115,
          isServer: rightIsServing && serverBox === 'RIGHT',
          isReceiver: !rightIsServing && receiverBox === 'RIGHT',
          initials: extractInitials(teamB.name, 'B1')
        },
        {
          id: 'B2',
          name: teamB.name,
          secondaryLabel: 'Lineup TBA',
          team: 'teamB',
          side: 'RIGHT',
          court: 'LEFT',
          boxName: 'bottom-right',
          x: 725,
          y: 285,
          isServer: rightIsServing && serverBox === 'LEFT',
          isReceiver: !rightIsServing && receiverBox === 'LEFT',
          initials: extractInitials(teamB.name, 'B2')
        }
      ];

  // 11. Game Point, Match Point, Winner flags
  const isGamePoint = Boolean(state.isGamePoint || engineState.isGamePoint);
  const isMatchPoint = Boolean(state.isMatchPoint || engineState.isMatchWon);
  const status = match.status || (engineState.isMatchWon ? 'COMPLETED' : 'LIVE');
  const winner = match.winnerTeamId
    ? (match.winnerTeamId === teamA.id ? 'teamA' : 'teamB')
    : (match.winner ? (match.winner === 'team_a' ? 'teamA' : 'teamB') : engineState.winner);

  const isGameWon = Boolean(state.gameWinner || match.isGameWon);
  const isMatchWon = Boolean(status === 'COMPLETED' || winner);

  // 12. Descriptive status subtext
  const isTeamAServing = Boolean(serveState?.isTeamAServing);
  const servingTeamName = isTeamAServing ? teamA.name : teamB.name;
  const receivingTeamName = isTeamAServing ? teamB.name : teamA.name;
  const servingStatusText = isBadminton
    ? `🏸 Serving: ${servingTeamName} (${serverBox} Box) ➔ Target: ${receivingTeamName} (${receiverBox} Box)`
    : `🎾 Serving: ${servingTeamName} (Server ${serverNumber}) • Score: ${mainScoreText}-${serverNumber}`;

  return {
    sport,
    format,
    isSingles,
    teamA,
    teamB,
    leftTeam,
    rightTeam,
    leftScore,
    rightScore,
    leftIsServing,
    rightIsServing,
    server: players.find(p => p.isServer) || null,
    receiver: players.find(p => p.isReceiver) || null,
    serverSide: serveState.serverSide,
    scoreA,
    scoreB,
    mainScoreText,
    gamesWonA,
    gamesWonB,
    currentGame,
    gamesWonText,
    servingTeam,
    servingSide, // 'team_a' | 'team_b' (for backward compatibility)
    isTeamAServing,
    serverBox,
    receiverBox,
    serverNumber,
    servingTeamName,
    receivingTeamName,
    servingStatusText,
    teamSides,
    serverCoords,
    receiverCoords,
    defaultBallCoords,
    players,
    isGamePoint,
    isMatchPoint,
    isGameWon,
    isMatchWon,
    winner,
    status,
    eventSeq: match?._eventSeq || state.eventSeq || 1,
    serveState,
    engineState
  };
}

/**
 * Backward-compatible wrapper for existing components.
 */
export function parseRacquetScoreDetails(match) {
  const courtState = getCourtState(match);
  return {
    sportSlug: courtState.sport,
    scoreA: courtState.scoreA,
    scoreB: courtState.scoreB,
    mainScoreText: courtState.mainScoreText,
    gamesWonText: courtState.gamesWonText,
    currentGameNumber: courtState.currentGame,
    gamesWonA: courtState.gamesWonA,
    gamesWonB: courtState.gamesWonB,
    servingSide: courtState.servingSide,
    serverCourt: courtState.serverBox,
    serverNumber: courtState.serverNumber,
    servingTeamName: courtState.servingTeamName,
    receivingTeamName: courtState.receivingTeamName,
    receivingCourt: courtState.receiverBox,
    servingStatusText: courtState.servingStatusText,
    isGamePoint: courtState.isGamePoint,
    isMatchPoint: courtState.isMatchPoint,
    courtState
  };
}

/**
 * Calculates contrasting stroke/line color based on chosen court color hex.
 */
export function getCourtContrastColor(hexColor) {
  const hex = (hexColor || '#0d5c3a').replace('#', '');
  if (hex.length < 6) return '#22d3ee';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 165 ? '#0f172a' : '#22d3ee';
}
