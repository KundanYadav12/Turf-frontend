/**
 * Single Authoritative Source of Truth for Racquet Sports (Badminton, Pickleball, Tennis).
 * Derives all court geometry, player positions, serving rules, and score formats.
 */

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
 *
 * Acceptance table:
 * | Server (side) | Score | Expected serving box | Target box |
 * | Left team     | 0 (even) | bottom-left       | top-right  |
 * | Left team     | 13 (odd) | top-left          | bottom-right |
 * | Right team    | 14 (even)| top-right         | bottom-left  |
 * | Right team    | 15 (odd) | bottom-right      | top-left   |
 *
 * @param {Object} match - Complete or partial match state object.
 * @returns {Object} { serverTeam, serverSide, serviceBox, receiverTeam, targetBox, label, ... }
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
  // Team on LEFT faces RIGHT:
  // - Right court is BOTTOM on screen
  // - Left court is TOP on screen
  // Team on RIGHT faces LEFT:
  // - Right court is TOP on screen
  // - Left court is BOTTOM on screen
  let serviceBox = 'bottom'; // 'top' | 'bottom'
  if (serverSide === 'left') {
    serviceBox = isEven ? 'bottom' : 'top';
  } else {
    // serverSide === 'right'
    serviceBox = isEven ? 'top' : 'bottom';
  }

  // 10. Screen Target Box Mapping (Diagonal Cross-Court)
  // Left bottom -> Right top
  // Left top -> Right bottom
  // Right top -> Left bottom
  // Right bottom -> Left top
  let targetBoxChoice = 'top';
  if (serverSide === 'left') {
    targetBoxChoice = serviceBox === 'top' ? 'bottom' : 'top';
  } else {
    targetBoxChoice = serviceBox === 'top' ? 'bottom' : 'top';
  }

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

export function getCourtState(match) {
  const serveState = match?.serveState || getServeState(match);

  // 1. Sport and format
  const sport = serveState.sport;
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
  const subtextRaw = (match?.score?.subtext || match?.live_subtext || match?.liveSubtext || '').trim();

  // 3. Team identity
  const teamA = serveState.teamSides.teamA === 'left' ? serveState.serverTeam : serveState.receiverTeam;
  const teamB = serveState.teamSides.teamB === 'right' ? serveState.receiverTeam : serveState.serverTeam;
  const actualTeamA = match?.teamA || {
    id: match?.team_a_id || 'A',
    name: match?.team_a_name || 'Team A',
    logo: match?.team_a_logo || null
  };
  const actualTeamB = match?.teamB || {
    id: match?.team_b_id || 'B',
    name: match?.team_b_name || 'Team B',
    logo: match?.team_b_logo || null
  };

  // 4. Scores and Games
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

  // 5. Authoritative Serving Team & Sides from serveState
  const isTeamAServing = serveState.isTeamAServing;
  const servingTeam = isTeamAServing ? 'teamA' : 'teamB';
  const servingSide = isTeamAServing ? 'team_a' : 'team_b';
  const serverBox = serveState.serverCourt;
  const receiverBox = serveState.receiverCourt;
  const teamSides = {
    teamA: serveState.teamSides.teamA.toUpperCase(),
    teamB: serveState.teamSides.teamB.toUpperCase()
  };
  const servingTeamSide = serveState.serverSide.toUpperCase();
  const receivingTeamSide = serveState.receiverSide.toUpperCase();

  // 6. Server Number for Pickleball (1 or 2)
  let serverNumber = state.serverNumber || 1;
  if (isPickleball && summaryRaw) {
    const parts = summaryRaw.split('-');
    if (parts.length === 3) {
      serverNumber = parseInt(parts[2].trim(), 10) || 1;
    }
  }

  // 7. Coordinates on 800x400 SVG Court ViewBox
  // Top-left: x=75, y=115 | Bottom-left: x=75, y=285
  // Top-right: x=725, y=115 | Bottom-right: x=725, y=285
  let serverCoords = { x: 75, y: 285 };
  if (serveState.servingBoxName === 'top-left') {
    serverCoords = { x: 75, y: 115 };
  } else if (serveState.servingBoxName === 'bottom-left') {
    serverCoords = { x: 75, y: 285 };
  } else if (serveState.servingBoxName === 'top-right') {
    serverCoords = { x: 725, y: 115 };
  } else if (serveState.servingBoxName === 'bottom-right') {
    serverCoords = { x: 725, y: 285 };
  }

  let receiverCoords = { x: 725, y: 115 };
  if (serveState.targetBoxName === 'top-left') {
    receiverCoords = { x: 75, y: 115 };
  } else if (serveState.targetBoxName === 'bottom-left') {
    receiverCoords = { x: 75, y: 285 };
  } else if (serveState.targetBoxName === 'top-right') {
    receiverCoords = { x: 725, y: 115 };
  } else if (serveState.targetBoxName === 'bottom-right') {
    receiverCoords = { x: 725, y: 285 };
  }

  const defaultBallCoords = {
    x: serveState.serverSide === 'left' ? serverCoords.x + 26 : serverCoords.x - 26,
    y: serverCoords.y
  };

  // 11. Player Roster & Doubles Partner Positions
  const players = [];
  if (isSingles) {
    players.push({
      id: `${servingTeam}_SERVER`,
      team: servingTeam,
      name: isTeamAServing ? teamA.name : teamB.name,
      x: serverCoords.x,
      y: serverCoords.y,
      isServer: true,
      isReceiver: false,
      box: serverBox,
      side: servingTeamSide
    });
    players.push({
      id: `${isTeamAServing ? 'teamB' : 'teamA'}_RECEIVER`,
      team: isTeamAServing ? 'teamB' : 'teamA',
      name: isTeamAServing ? teamB.name : teamA.name,
      x: receiverCoords.x,
      y: receiverCoords.y,
      isServer: false,
      isReceiver: true,
      box: receiverBox,
      side: receivingTeamSide
    });
  } else {
    // Doubles: 4 Players (2 per side)
    // Left side:
    const leftIsServing = servingTeamSide === 'LEFT';
    const leftServerBox = leftIsServing ? serverBox : receiverBox;
    const leftPartnerBox = leftServerBox === 'RIGHT' ? 'LEFT' : 'RIGHT';

    players.push({
      id: leftIsServing ? `${servingTeam}_P1` : `${isTeamAServing ? 'teamB' : 'teamA'}_P1`,
      team: leftIsServing ? servingTeam : (isTeamAServing ? 'teamB' : 'teamA'),
      name: leftIsServing ? (isTeamAServing ? teamA.name : teamB.name) : (isTeamAServing ? teamB.name : teamA.name),
      x: 75,
      y: leftServerBox === 'RIGHT' ? 285 : 115,
      isServer: leftIsServing,
      isReceiver: !leftIsServing,
      box: leftServerBox,
      side: 'LEFT'
    });
    players.push({
      id: leftIsServing ? `${servingTeam}_P2` : `${isTeamAServing ? 'teamB' : 'teamA'}_P2`,
      team: leftIsServing ? servingTeam : (isTeamAServing ? 'teamB' : 'teamA'),
      name: 'Partner',
      x: 75,
      y: leftPartnerBox === 'RIGHT' ? 285 : 115,
      isServer: false,
      isReceiver: false,
      box: leftPartnerBox,
      side: 'LEFT'
    });

    // Right side:
    const rightIsServing = servingTeamSide === 'RIGHT';
    const rightServerBox = rightIsServing ? serverBox : receiverBox;
    const rightPartnerBox = rightServerBox === 'RIGHT' ? 'LEFT' : 'RIGHT';

    players.push({
      id: rightIsServing ? `${servingTeam}_P1` : `${isTeamAServing ? 'teamB' : 'teamA'}_P1`,
      team: rightIsServing ? servingTeam : (isTeamAServing ? 'teamB' : 'teamA'),
      name: rightIsServing ? (isTeamAServing ? teamA.name : teamB.name) : (isTeamAServing ? teamB.name : teamA.name),
      x: 725,
      y: rightServerBox === 'RIGHT' ? 285 : 115,
      isServer: rightIsServing,
      isReceiver: !rightIsServing,
      box: rightServerBox,
      side: 'RIGHT'
    });
    players.push({
      id: rightIsServing ? `${servingTeam}_P2` : `${isTeamAServing ? 'teamB' : 'teamA'}_P2`,
      team: rightIsServing ? servingTeam : (isTeamAServing ? 'teamB' : 'teamA'),
      name: 'Partner',
      x: 725,
      y: rightPartnerBox === 'RIGHT' ? 285 : 115,
      isServer: false,
      isReceiver: false,
      box: rightPartnerBox,
      side: 'RIGHT'
    });
  }

  // 12. Game Point, Match Point, Winner flags
  const isGamePoint = Boolean(state.isGamePoint);
  const isMatchPoint = Boolean(state.isMatchPoint);
  const status = match.status || 'LIVE';
  const winner = match.winnerTeamId
    ? (match.winnerTeamId === teamA.id ? 'teamA' : 'teamB')
    : (match.winner ? (match.winner === 'team_a' ? 'teamA' : 'teamB') : null);

  const isGameWon = Boolean(state.gameWinner || match.isGameWon);
  const isMatchWon = Boolean(status === 'COMPLETED' || winner);

  // 13. Descriptive status subtext
  const servingTeamName = isTeamAServing ? teamA.name : teamB.name;
  const receivingTeamName = isTeamAServing ? teamB.name : teamA.name;
  const servingStatusText = isBadminton
    ? `🏸 Serving: ${servingTeamName} (${serverBox} Box) ➔ Target: ${receivingTeamName} (${receiverBox} Box)`
    : `🎾 Serving: ${servingTeamName} (Server ${serverNumber}) • Score: ${mainScoreText}-${serverNumber}`;

  return {
    sport,
    format,
    teamA,
    teamB,
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
    serveState
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
