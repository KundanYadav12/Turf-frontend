/**
 * Pure, deterministic rules-driven court state engine for Racquet Sports (Pickleball, Badminton, Tennis, etc.).
 * Single Source of Truth for scoring, court geometry, player positions, serving rules, and state transitions.
 *
 * Guaranteed Properties:
 * 1. Pure & Deterministic: Same input history produces the identical state on Web, Mobile, Scorer, TV, and Signage.
 * 2. Per-Sport Adapters: Modular adapters for USA Pickleball (Side-Out & Rally) and BWF Badminton (Rally).
 * 3. Exact Player Tracking: Doubles partners swap courts only when authorized by sport rules.
 * 4. Idempotent & Reversible: Undo recomputes from history without guessing.
 * 5. Screen Geometry Mapping: 800x400 SVG Court coordinates with Left/Right team orientations and diagonal boxes.
 */

// Screen Box Names & Geometry Constants (viewBox: 800x400)
export const COURT_BOXES = {
  TOP_LEFT: 'top-left',
  BOTTOM_LEFT: 'bottom-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_RIGHT: 'bottom-right'
};

// SVG Coordinates for Box Centers (Player positioning & Ball landing)
export const BOX_COORDINATES = {
  'top-left':    { x: 170, y: 115 },
  'bottom-left': { x: 170, y: 285 },
  'top-right':   { x: 630, y: 115 },
  'bottom-right':{ x: 630, y: 285 }
};

// Player Marker Baseline Coordinates (where players stand)
export const PLAYER_REST_COORDINATES = {
  'top-left':    { x: 75,  y: 115 },
  'bottom-left': { x: 75,  y: 285 },
  'top-right':   { x: 725, y: 115 },
  'bottom-right':{ x: 725, y: 285 }
};

// Box Boundaries on 800x400 court
export const BOX_RECTS = {
  'top-left':    { x: 30,  y: 25,  width: 280, height: 175 },
  'bottom-left': { x: 30,  y: 200, width: 280, height: 175 },
  'top-right':   { x: 490, y: 25,  width: 280, height: 175 },
  'bottom-right':{ x: 490, y: 200, width: 280, height: 175 }
};

/**
 * Determine Screen Box from Team Screen Side ('LEFT' | 'RIGHT') and Player Perspective Court ('RIGHT' | 'LEFT').
 * - Team on LEFT faces RIGHT: Right court is BOTTOM, Left court is TOP.
 * - Team on RIGHT faces LEFT: Right court is TOP, Left court is BOTTOM.
 */
export function getScreenBox(teamSide, playerCourt) {
  const isLeftTeam = String(teamSide).toUpperCase() === 'LEFT';
  const isRightCourt = String(playerCourt).toUpperCase() === 'RIGHT';

  if (isLeftTeam) {
    return isRightCourt ? 'bottom-left' : 'top-left';
  } else {
    return isRightCourt ? 'top-right' : 'bottom-right';
  }
}

/**
 * Cross-court diagonal target box for a given service box.
 */
export function getDiagonalReceiverBox(servingBoxName) {
  switch (servingBoxName) {
    case 'bottom-left': return 'top-right';
    case 'top-left':    return 'bottom-right';
    case 'top-right':   return 'bottom-left';
    case 'bottom-right':return 'top-left';
    default:            return 'top-right';
  }
}

/**
 * Extracts clean initials from a player or team name.
 */
export function extractInitials(name, fallback = 'P') {
  if (!name || typeof name !== 'string') return fallback;
  const clean = name.trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normalizes player object representation.
 */
function normalizePlayer(rawPlayer, defaultId, defaultName, defaultStartCourt = 'RIGHT') {
  if (!rawPlayer) {
    return {
      id: defaultId,
      name: defaultName,
      rawName: defaultName,
      isTBA: true,
      startCourt: defaultStartCourt,
      initials: extractInitials(defaultName, defaultId)
    };
  }
  if (typeof rawPlayer === 'string') {
    return {
      id: rawPlayer || defaultId,
      name: rawPlayer,
      rawName: rawPlayer,
      isTBA: false,
      startCourt: defaultStartCourt,
      initials: extractInitials(rawPlayer, defaultId)
    };
  }
  const name = rawPlayer.name || rawPlayer.playerName || defaultName;
  const isTBA = Boolean(rawPlayer.isTBA || (!rawPlayer.name && !rawPlayer.playerName));
  const id = rawPlayer.id || rawPlayer.member_id || (rawPlayer.name && !isTBA ? rawPlayer.name : defaultId);
  return {
    id,
    name,
    rawName: name,
    isTBA,
    startCourt: rawPlayer.startCourt || defaultStartCourt,
    initials: rawPlayer.initials || extractInitials(name, defaultId)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH: PICKLEBALL DOUBLES COURT POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministically calculates player positions ('RIGHT' | 'LEFT') for a pickleball doubles team
 * based strictly on the team's score parity and immutable starting positions.
 *
 * USA Pickleball Doubles Odd/Even Rules:
 * - Even team score (0, 2, 4, 6, 8, 10...):
 *     Player who started on RIGHT occupies RIGHT-side position.
 *     Player who started on LEFT occupies LEFT-side position.
 * - Odd team score (1, 3, 5, 7, 9...):
 *     Player who started on RIGHT occupies LEFT-side position.
 *     Player who started on LEFT occupies RIGHT-side position.
 *
 * @param {number} teamScore - Authoritative score of the team
 * @param {Object|Array} originalPlayerPositions - Immutable starting position record:
 *        Object: { [player1Id]: 'RIGHT', [player2Id]: 'LEFT' } or { rightPlayerId, leftPlayerId }
 *        Array: [ player1, player2 ] (index 0 started right, index 1 started left, or startCourt property)
 * @returns {Object} Map of { [playerId]: 'RIGHT' | 'LEFT' }
 */
export function calculatePickleballDoublesPositions(teamScore, originalPlayerPositions) {
  const score = Math.max(0, parseInt(teamScore, 10) || 0);
  const isEven = (score % 2 === 0);

  let rightPlayerId = null;
  let leftPlayerId = null;

  if (Array.isArray(originalPlayerPositions)) {
    if (originalPlayerPositions.length >= 2) {
      const p0 = originalPlayerPositions[0];
      const p1 = originalPlayerPositions[1];
      const p0Id = (typeof p0 === 'object' && p0 !== null) ? (p0.id || p0.name || p0.playerName) : String(p0);
      const p1Id = (typeof p1 === 'object' && p1 !== null) ? (p1.id || p1.name || p1.playerName) : String(p1);

      const p0Court = (typeof p0 === 'object' && p0?.startCourt) ? String(p0.startCourt).toUpperCase() : 'RIGHT';
      if (p0Court === 'RIGHT') {
        rightPlayerId = p0Id;
        leftPlayerId = p1Id;
      } else {
        rightPlayerId = p1Id;
        leftPlayerId = p0Id;
      }
    } else if (originalPlayerPositions.length === 1) {
      const p0 = originalPlayerPositions[0];
      const p0Id = (typeof p0 === 'object' && p0 !== null) ? (p0.id || p0.name || p0.playerName) : String(p0);
      rightPlayerId = p0Id;
    }
  } else if (originalPlayerPositions && typeof originalPlayerPositions === 'object') {
    if (originalPlayerPositions.rightPlayerId || originalPlayerPositions.leftPlayerId) {
      rightPlayerId = originalPlayerPositions.rightPlayerId;
      leftPlayerId = originalPlayerPositions.leftPlayerId;
    } else if (originalPlayerPositions.right || originalPlayerPositions.left) {
      rightPlayerId = originalPlayerPositions.right;
      leftPlayerId = originalPlayerPositions.left;
    } else {
      const rightKeys = [];
      const leftKeys = [];
      for (const [id, court] of Object.entries(originalPlayerPositions)) {
        if (String(court).toUpperCase() === 'RIGHT') {
          rightKeys.push(id);
        } else if (String(court).toUpperCase() === 'LEFT') {
          leftKeys.push(id);
        }
      }
      if (rightKeys.length > 0 && leftKeys.length > 0) {
        const result = {};
        for (const rk of rightKeys) {
          result[rk] = isEven ? 'RIGHT' : 'LEFT';
        }
        for (const lk of leftKeys) {
          result[lk] = isEven ? 'LEFT' : 'RIGHT';
        }
        return result;
      }
      const keys = Object.keys(originalPlayerPositions);
      rightPlayerId = keys[0];
      leftPlayerId = keys[1];
    }
  }

  const result = {};

  if (rightPlayerId && leftPlayerId) {
    if (isEven) {
      // Even score: preserve original assignments
      result[rightPlayerId] = 'RIGHT';
      result[leftPlayerId] = 'LEFT';
    } else {
      // Odd score: reverse original assignments
      result[rightPlayerId] = 'LEFT';
      result[leftPlayerId] = 'RIGHT';
    }
  } else if (rightPlayerId) {
    result[rightPlayerId] = isEven ? 'RIGHT' : 'LEFT';
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-SPORT ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. USA PICKLEBALL ADAPTER (Side-Out & Rally Modes)
 */
export const PickleballAdapter = {
  sport: 'pickleball',

  init({ format = 'DOUBLES', scoringMode = 'SIDE_OUT', rotationRule = 'OFFICIAL', teamA, teamB, lineup, startingServingTeam = 'teamA', switchEnds = false, currentGame = 1, scores = null, servePoints = null, playerLocations: existingLocations = null }) {
    const isDoubles = String(format).toUpperCase() !== 'SINGLES';
    const isBadmintonRule = String(rotationRule || '').toUpperCase() === 'BADMINTON' || String(rotationRule || '').toUpperCase() === 'BADMINTON_STYLE';
    const isSideOut = !isBadmintonRule && String(scoringMode).toUpperCase() !== 'RALLY';

    // Normalized Lineup
    const playersA = isDoubles
      ? [
          normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name ? `${teamA.name} 1` : 'A1', 'RIGHT'),
          normalizePlayer(lineup?.teamA?.[1], 'A2', teamA?.name ? `${teamA.name} 2` : 'A2', 'LEFT')
        ]
      : [
          normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name || 'A1', 'RIGHT')
        ];

    const playersB = isDoubles
      ? [
          normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name ? `${teamB.name} 1` : 'B1', 'RIGHT'),
          normalizePlayer(lineup?.teamB?.[1], 'B2', teamB?.name ? `${teamB.name} 2` : 'B2', 'LEFT')
        ]
      : [
          normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name || 'B1', 'RIGHT')
        ];

    // If both players of a team have isTBA set or empty names, mark team Lineup TBA
    const isLineupSetA = Boolean(lineup?.teamA && lineup.teamA.length > 0 && !playersA[0].isTBA);
    const isLineupSetB = Boolean(lineup?.teamB && lineup.teamB.length > 0 && !playersB[0].isTBA);

    // Immutable Original Starting Positions
    const originalPositionsA = {
      [playersA[0].id]: playersA[0].startCourt || 'RIGHT',
      [playersA[0].name]: playersA[0].startCourt || 'RIGHT',
      ...(isDoubles ? {
        [playersA[1].id]: playersA[1].startCourt || 'LEFT',
        [playersA[1].name]: playersA[1].startCourt || 'LEFT'
      } : {})
    };
    const originalPositionsB = {
      [playersB[0].id]: playersB[0].startCourt || 'RIGHT',
      [playersB[0].name]: playersB[0].startCourt || 'RIGHT',
      ...(isDoubles ? {
        [playersB[1].id]: playersB[1].startCourt || 'LEFT',
        [playersB[1].name]: playersB[1].startCourt || 'LEFT'
      } : {})
    };

    const initialScoreA = scores?.teamA ?? 0;
    const initialScoreB = scores?.teamB ?? 0;
    const initialServePointsA = servePoints?.teamA ?? initialScoreA;
    const initialServePointsB = servePoints?.teamB ?? initialScoreB;

    // Initialize playerLocations keyed by both ID and Name
    let playerLocations = {};
    if (existingLocations && typeof existingLocations === 'object' && Object.keys(existingLocations).length > 0) {
      playerLocations = { ...existingLocations };
    } else if (isDoubles) {
      if (isSideOut) {
        if (initialScoreA > 0 || initialScoreB > 0) {
          const posA = calculatePickleballDoublesPositions(initialScoreA, originalPositionsA);
          const posB = calculatePickleballDoublesPositions(initialScoreB, originalPositionsB);
          playerLocations = { ...posA, ...posB };
        } else {
          playerLocations[playersA[0].id] = playersA[0].startCourt || 'RIGHT';
          playerLocations[playersA[1].id] = playersA[1].startCourt || 'LEFT';
          playerLocations[playersB[0].id] = playersB[0].startCourt || 'RIGHT';
          playerLocations[playersB[1].id] = playersB[1].startCourt || 'LEFT';
        }
      } else {
        // Rally scoring: positions derived from points scored while serving
        const posA = calculatePickleballDoublesPositions(initialServePointsA, originalPositionsA);
        const posB = calculatePickleballDoublesPositions(initialServePointsB, originalPositionsB);
        playerLocations = { ...posA, ...posB };
      }
      for (const p of [...playersA, ...playersB]) {
        if (p.name) playerLocations[p.name] = playerLocations[p.id];
        if (p.rawName) playerLocations[p.rawName] = playerLocations[p.id];
      }
    } else {
      playerLocations[playersA[0].id] = (initialScoreA % 2 === 0) ? (playersA[0].startCourt || 'RIGHT') : (playersA[0].startCourt === 'LEFT' ? 'RIGHT' : 'LEFT');
      playerLocations[playersB[0].id] = (initialScoreB % 2 === 0) ? (playersB[0].startCourt || 'RIGHT') : (playersB[0].startCourt === 'LEFT' ? 'RIGHT' : 'LEFT');
      for (const p of [playersA[0], playersB[0]]) {
        if (p.name) playerLocations[p.name] = playerLocations[p.id];
      }
    }

    // Starting Serving Team & Server
    // Traditional Side-Out Doubles starts at "0-0-2" (USA Pickleball Rule 4.B.6)
    const servingTeam = startingServingTeam === 'teamB' ? 'teamB' : 'teamA';
    const serverNumber = isSideOut && isDoubles ? 2 : 1;

    // First server is the player standing in the RIGHT court of the serving team
    const sPlayers = servingTeam === 'teamA' ? playersA : playersB;
    const firstServer = isDoubles
      ? (sPlayers.find(p => (playerLocations[p.id] || playerLocations[p.name]) === 'RIGHT') || sPlayers[0])
      : sPlayers[0];
    const currentServerId = firstServer.id;

    // Determine team sides based on switchEnds
    let teamSides = { teamA: 'LEFT', teamB: 'RIGHT' };
    if (switchEnds && currentGame === 2) {
      teamSides = { teamA: 'RIGHT', teamB: 'LEFT' };
    }

    return {
      sport: 'pickleball',
      format: isDoubles ? 'DOUBLES' : 'SINGLES',
      scoringMode: isBadmintonRule ? 'RALLY' : (isSideOut ? 'SIDE_OUT' : 'RALLY'),
      rotationRule: isBadmintonRule ? 'BADMINTON' : 'OFFICIAL',
      scores: { teamA: initialScoreA, teamB: initialScoreB },
      servingTeam,
      serverNumber,
      currentServerId,
      playersA,
      playersB,
      isLineupSetA,
      isLineupSetB,
      originalPlayerPositions: {
        teamA: originalPositionsA,
        teamB: originalPositionsB
      },
      playerLocations,
      teamSides,
      isSideOut: false,
      isServerChange: false,
      isPointScored: false,
      scoringTeam: null,
      movingPlayerIds: [],
      currentGame: currentGame || 1,
      switchEnds: Boolean(switchEnds),
      servePoints: {
        teamA: initialServePointsA,
        teamB: initialServePointsB
      }
    };
  },

  applyPoint(state, pointTo) {
    const isDoubles = state.format === 'DOUBLES';
    const isBadmintonRule = state.rotationRule === 'BADMINTON' || state.rotationRule === 'BADMINTON_STYLE';
    const isSideOut = !isBadmintonRule && state.scoringMode === 'SIDE_OUT';
    const winningTeam = (pointTo === 'teamB' || pointTo === 'team_b') ? 'teamB' : 'teamA';
    const isServingTeamWinner = winningTeam === state.servingTeam;

    let newScores = { ...state.scores };
    let newServingTeam = state.servingTeam;
    let newServerNumber = state.serverNumber;
    let newPlayerLocations = { ...state.playerLocations };
    let newServePoints = {
      teamA: state.servePoints?.teamA || 0,
      teamB: state.servePoints?.teamB || 0
    };
    let isSideOutOccurred = false;
    let isServerChange = false;
    let isPointScored = false;
    let scoringTeam = winningTeam;
    let movingPlayerIds = [];

    if (isSideOut) {
      // ───────────────────────────────────────────────────────────────────────
      // TRADITIONAL SIDE-OUT SCORING (USA Pickleball)
      // Only the serving team scores points.
      // ───────────────────────────────────────────────────────────────────────
      if (isServingTeamWinner) {
        newScores[state.servingTeam] += 1;
        isPointScored = true;
        scoringTeam = state.servingTeam;

        if (isDoubles) {
          const sPlayers = state.servingTeam === 'teamA' ? state.playersA : state.playersB;
          const p1 = sPlayers[0];
          const p2 = sPlayers[1];
          const loc1 = state.playerLocations[p1.id] || state.playerLocations[p1.name] || p1.startCourt || 'RIGHT';
          const loc2 = state.playerLocations[p2.id] || state.playerLocations[p2.name] || p2.startCourt || 'LEFT';

          newPlayerLocations[p1.id] = loc2;
          newPlayerLocations[p1.name] = loc2;
          newPlayerLocations[p2.id] = loc1;
          newPlayerLocations[p2.name] = loc1;
          movingPlayerIds = [p1.id, p2.id];
        } else {
          const sPlayers = state.servingTeam === 'teamA' ? state.playersA : state.playersB;
          const p1 = sPlayers[0];
          const targetCourt = (newScores[state.servingTeam] % 2 === 0) ? 'RIGHT' : 'LEFT';
          newPlayerLocations[p1.id] = targetCourt;
          newPlayerLocations[p1.name] = targetCourt;
          movingPlayerIds = [p1.id];
        }
      } else {
        if (isDoubles) {
          if (state.serverNumber === 1) {
            newServerNumber = 2;
            isServerChange = true;
          } else {
            isSideOutOccurred = true;
            isServerChange = true;
            newServingTeam = state.servingTeam === 'teamA' ? 'teamB' : 'teamA';
            newServerNumber = 1;
          }
        } else {
          isSideOutOccurred = true;
          isServerChange = true;
          newServingTeam = state.servingTeam === 'teamA' ? 'teamB' : 'teamA';
          newServerNumber = 1;
          const newSPlayers = newServingTeam === 'teamA' ? state.playersA : state.playersB;
          const targetCourt = (newScores[newServingTeam] % 2 === 0) ? 'RIGHT' : 'LEFT';
          newPlayerLocations[newSPlayers[0].id] = targetCourt;
          newPlayerLocations[newSPlayers[0].name] = targetCourt;
        }
      }
    } else {
      // ───────────────────────────────────────────────────────────────────────
      // RALLY SCORING MODE (Pickleball)
      // Every rally awards a point.
      // ───────────────────────────────────────────────────────────────────────
      newScores[winningTeam] += 1;
      isPointScored = true;
      scoringTeam = winningTeam;
      newServerNumber = 1;

      if (isServingTeamWinner) {
        // Serving team wins the rally:
        // ONLY the serving team's two players swap sides. The receiving team does NOT swap.
        // Increment that team's points scored while serving:
        newServePoints[state.servingTeam] += 1;

        if (isDoubles) {
          const sTeam = state.servingTeam;
          const sOriginal = state.originalPlayerPositions?.[sTeam] || (sTeam === 'teamA' ? {
            [state.playersA[0].id]: 'RIGHT',
            [state.playersA[1].id]: 'LEFT'
          } : {
            [state.playersB[0].id]: 'RIGHT',
            [state.playersB[1].id]: 'LEFT'
          });

          // Derive positions from points scored while serving: even -> original sides, odd -> swapped
          const updatedPos = calculatePickleballDoublesPositions(newServePoints[sTeam], sOriginal);
          newPlayerLocations = { ...newPlayerLocations, ...updatedPos };

          const sPlayers = sTeam === 'teamA' ? state.playersA : state.playersB;
          for (const p of sPlayers) {
            const loc = updatedPos[p.id] || updatedPos[p.name] || newPlayerLocations[p.id] || newPlayerLocations[p.name];
            if (loc) {
              if (p.id) newPlayerLocations[p.id] = loc;
              if (p.name) newPlayerLocations[p.name] = loc;
              if (p.rawName) newPlayerLocations[p.rawName] = loc;
            }
          }
          movingPlayerIds = [sPlayers[0].id, sPlayers[1]?.id].filter(Boolean);
        } else {
          // Singles: server moves to court matching new score parity
          const sPlayers = state.servingTeam === 'teamA' ? state.playersA : state.playersB;
          const p1 = sPlayers[0];
          const targetCourt = (newScores[state.servingTeam] % 2 === 0) ? 'RIGHT' : 'LEFT';
          newPlayerLocations[p1.id] = targetCourt;
          if (p1.name) newPlayerLocations[p1.name] = targetCourt;
          movingPlayerIds = [p1.id];
        }
      } else {
        // Receiving team wins the rally:
        // NO player on either team swaps. Everyone stays where they are.
        // The winning team becomes the serving team:
        newServingTeam = winningTeam;
        isSideOutOccurred = true;
        isServerChange = true;

        if (!isDoubles) {
          const sPlayers = newServingTeam === 'teamA' ? state.playersA : state.playersB;
          const p1 = sPlayers[0];
          const targetCourt = (newScores[newServingTeam] % 2 === 0) ? 'RIGHT' : 'LEFT';
          newPlayerLocations[p1.id] = targetCourt;
          if (p1.name) newPlayerLocations[p1.name] = targetCourt;
          movingPlayerIds = [p1.id];
        }
      }
    }

    // Server selection (Rule 1):
    // The server is always the player currently standing in the court that matches the serving team's score parity:
    const sScore = newScores[newServingTeam];
    const nextServiceCourt = (sScore % 2 === 0) ? 'RIGHT' : 'LEFT';
    const nextSPlayers = newServingTeam === 'teamA' ? state.playersA : state.playersB;
    const nextServer = isDoubles
      ? (nextSPlayers.find(p => (newPlayerLocations[p.id] || newPlayerLocations[p.name]) === nextServiceCourt) || nextSPlayers[0])
      : nextSPlayers[0];
    const newCurrentServerId = nextServer.id;

    // Change of ends check in deciding game (if enabled)
    let newTeamSides = { ...state.teamSides };
    if (state.switchEnds && state.currentGame >= 3) {
      const leader = Math.max(newScores.teamA, newScores.teamB);
      if (leader >= 6 && (state.scores.teamA < 6 && state.scores.teamB < 6)) {
        newTeamSides = {
          teamA: state.teamSides.teamA === 'LEFT' ? 'RIGHT' : 'LEFT',
          teamB: state.teamSides.teamB === 'RIGHT' ? 'LEFT' : 'RIGHT'
        };
      }
    }

    return {
      ...state,
      scores: newScores,
      servingTeam: newServingTeam,
      serverNumber: newServerNumber,
      currentServerId: newCurrentServerId,
      playerLocations: newPlayerLocations,
      teamSides: newTeamSides,
      isSideOut: isSideOutOccurred,
      isServerChange,
      isPointScored,
      scoringTeam,
      movingPlayerIds,
      servePoints: newServePoints
    };
  },

  deriveGeometry(state) {
    const isDoubles = state.format === 'DOUBLES';
    const isSideOut = state.scoringMode === 'SIDE_OUT';
    const sTeam = state.servingTeam;
    const rTeam = sTeam === 'teamA' ? 'teamB' : 'teamA';
    const sSide = state.teamSides[sTeam]; // 'LEFT' or 'RIGHT'
    const rSide = state.teamSides[rTeam];

    const sPlayers = sTeam === 'teamA' ? state.playersA : state.playersB;
    const rPlayers = rTeam === 'teamA' ? state.playersA : state.playersB;

    // RULE 1: Server court is strictly determined by serving team's score parity:
    // even -> Right court, odd -> Left court.
    const sScore = state.scores[sTeam];
    const serviceCourt = (sScore % 2 === 0) ? 'RIGHT' : 'LEFT';

    // The server is always the player currently standing in the court that matches the serving team's score parity:
    let servingPlayer = null;
    if (isDoubles) {
      servingPlayer = sPlayers.find(p => (state.playerLocations[p.id] || state.playerLocations[p.name] || state.playerLocations[p.rawName]) === serviceCourt) || sPlayers[0];
    } else {
      servingPlayer = sPlayers[0];
    }

    // The receiver is the opposing player standing diagonally opposite (Right serve -> opponent's Right court, Left serve -> opponent's Left court):
    const receiverCourt = serviceCourt;
    let receivingPlayer = null;
    if (isDoubles) {
      receivingPlayer = rPlayers.find(p => (state.playerLocations[p.id] || state.playerLocations[p.name] || state.playerLocations[p.rawName]) === receiverCourt) || rPlayers[0];
    } else {
      receivingPlayer = rPlayers[0];
    }

    const servingBoxName = getScreenBox(sSide, serviceCourt);
    const targetBoxName = getDiagonalReceiverBox(servingBoxName);

    const callText = isSideOut && isDoubles
      ? `${sScore} - ${state.scores[rTeam]} - ${state.serverNumber}`
      : `${sScore} - ${state.scores[rTeam]}`;

    return {
      servingPlayer,
      receivingPlayer,
      serviceCourt,
      receiverCourt,
      servingBoxName,
      targetBoxName,
      callText
    };
  }
};


/**
 * 2. BWF BADMINTON ADAPTER (Rally-Point Scoring)
 */
export const BadmintonAdapter = {
  sport: 'badminton',

  init({ format = 'DOUBLES', teamA, teamB, lineup, startingServingTeam = 'teamA', switchEnds = false, currentGame = 1 }) {
    const isDoubles = String(format).toUpperCase() !== 'SINGLES';

    const playersA = isDoubles
      ? [
          normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name ? `${teamA.name} 1` : 'A1', 'RIGHT'),
          normalizePlayer(lineup?.teamA?.[1], 'A2', teamA?.name ? `${teamA.name} 2` : 'A2', 'LEFT')
        ]
      : [
          normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name || 'A1', 'RIGHT')
        ];

    const playersB = isDoubles
      ? [
          normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name ? `${teamB.name} 1` : 'B1', 'RIGHT'),
          normalizePlayer(lineup?.teamB?.[1], 'B2', teamB?.name ? `${teamB.name} 2` : 'B2', 'LEFT')
        ]
      : [
          normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name || 'B1', 'RIGHT')
        ];

    const isLineupSetA = Boolean(lineup?.teamA && lineup.teamA.length > 0 && !playersA[0].isTBA);
    const isLineupSetB = Boolean(lineup?.teamB && lineup.teamB.length > 0 && !playersB[0].isTBA);

    const playerLocations = {};
    playerLocations[playersA[0].id] = playersA[0].startCourt || 'RIGHT';
    if (playersA[0].name) playerLocations[playersA[0].name] = playerLocations[playersA[0].id];
    if (isDoubles) {
      playerLocations[playersA[1].id] = playersA[1].startCourt || 'LEFT';
      if (playersA[1].name) playerLocations[playersA[1].name] = playerLocations[playersA[1].id];
    }
    playerLocations[playersB[0].id] = playersB[0].startCourt || 'RIGHT';
    if (playersB[0].name) playerLocations[playersB[0].name] = playerLocations[playersB[0].id];
    if (isDoubles) {
      playerLocations[playersB[1].id] = playersB[1].startCourt || 'LEFT';
      if (playersB[1].name) playerLocations[playersB[1].name] = playerLocations[playersB[1].id];
    }

    const servingTeam = startingServingTeam === 'teamB' ? 'teamB' : 'teamA';

    let teamSides = { teamA: 'LEFT', teamB: 'RIGHT' };
    if (switchEnds && currentGame === 2) {
      teamSides = { teamA: 'RIGHT', teamB: 'LEFT' };
    }

    return {
      sport: 'badminton',
      format: isDoubles ? 'DOUBLES' : 'SINGLES',
      scoringMode: 'RALLY',
      scores: { teamA: 0, teamB: 0 },
      servingTeam,
      serverNumber: 1,
      playersA,
      playersB,
      isLineupSetA,
      isLineupSetB,
      playerLocations,
      teamSides,
      isSideOut: false,
      isServerChange: false,
      isPointScored: false,
      scoringTeam: null,
      movingPlayerIds: [],
      currentGame: currentGame || 1,
      switchEnds: Boolean(switchEnds)
    };
  },

  applyPoint(state, pointTo) {
    const isDoubles = state.format === 'DOUBLES';
    const winningTeam = pointTo === 'teamB' ? 'teamB' : 'teamA';
    const isServingTeamWinner = winningTeam === state.servingTeam;

    let newScores = { ...state.scores };
    newScores[winningTeam] += 1;

    let newServingTeam = state.servingTeam;
    let newPlayerLocations = { ...state.playerLocations };
    let isSideOutOccurred = false;
    let isServerChange = false;
    let movingPlayerIds = [];

    if (isServingTeamWinner) {
      // ─────────────────────────────────────────────────────────────────────
      // SERVING SIDE WINS RALLY:
      // In doubles, only the serving side swaps courts!
      // In singles, the server swaps to the court matching their new parity.
      // ─────────────────────────────────────────────────────────────────────
      if (isDoubles) {
        const sPlayers = state.servingTeam === 'teamA' ? state.playersA : state.playersB;
        const p1 = sPlayers[0];
        const p2 = sPlayers[1];
        const loc1 = newPlayerLocations[p1.id] || newPlayerLocations[p1.name] || 'RIGHT';
        const loc2 = newPlayerLocations[p2.id] || newPlayerLocations[p2.name] || 'LEFT';
        newPlayerLocations[p1.id] = loc2;
        newPlayerLocations[p2.id] = loc1;
        if (p1.name) newPlayerLocations[p1.name] = loc2;
        if (p2.name) newPlayerLocations[p2.name] = loc1;
        movingPlayerIds = [p1.id, p2.id];
      } else {
        const sPlayers = state.servingTeam === 'teamA' ? state.playersA : state.playersB;
        const p1 = sPlayers[0].id;
        newPlayerLocations[p1] = newScores[state.servingTeam] % 2 === 0 ? 'RIGHT' : 'LEFT';
        movingPlayerIds = [p1];
      }
    } else {
      // ─────────────────────────────────────────────────────────────────────
      // RECEIVING SIDE WINS RALLY:
      // Service changes to receiving side. NEITHER SIDE SWAPS COURTS in doubles!
      // Server is whichever partner is in the court matching their score parity.
      // ─────────────────────────────────────────────────────────────────────
      newServingTeam = winningTeam;
      isSideOutOccurred = true;
      isServerChange = true;
      if (!isDoubles) {
        const sPlayers = newServingTeam === 'teamA' ? state.playersA : state.playersB;
        const p1 = sPlayers[0].id;
        newPlayerLocations[p1] = newScores[newServingTeam] % 2 === 0 ? 'RIGHT' : 'LEFT';
        movingPlayerIds = [p1];
      }
    }

    // Change of ends check in deciding game (BWF: swap ends at 11 in Game 3)
    let newTeamSides = { ...state.teamSides };
    if (state.switchEnds && state.currentGame >= 3) {
      const leader = Math.max(newScores.teamA, newScores.teamB);
      if (leader >= 11 && (state.scores.teamA < 11 && state.scores.teamB < 11)) {
        newTeamSides = {
          teamA: state.teamSides.teamA === 'LEFT' ? 'RIGHT' : 'LEFT',
          teamB: state.teamSides.teamB === 'RIGHT' ? 'LEFT' : 'RIGHT'
        };
      }
    }

    return {
      ...state,
      scores: newScores,
      servingTeam: newServingTeam,
      serverNumber: 1,
      playerLocations: newPlayerLocations,
      teamSides: newTeamSides,
      isSideOut: isSideOutOccurred,
      isServerChange,
      isPointScored: true,
      scoringTeam: winningTeam,
      movingPlayerIds
    };
  },

  deriveGeometry(state) {
    const isDoubles = state.format === 'DOUBLES';
    const sTeam = state.servingTeam;
    const rTeam = sTeam === 'teamA' ? 'teamB' : 'teamA';
    const sSide = state.teamSides[sTeam];
    const sPlayers = sTeam === 'teamA' ? state.playersA : state.playersB;
    const rPlayers = rTeam === 'teamA' ? state.playersA : state.playersB;

    // BWF Service Court Parity:
    // Even score -> RIGHT court. Odd score -> LEFT court.
    const sScore = state.scores[sTeam];
    const serviceCourt = sScore % 2 === 0 ? 'RIGHT' : 'LEFT';
    const receiverCourt = serviceCourt; // Cross court diagonal

    let servingPlayer = null;
    let receivingPlayer = null;

    if (isDoubles) {
      servingPlayer = sPlayers.find(p => (state.playerLocations[p.id] || state.playerLocations[p.name] || state.playerLocations[p.rawName]) === serviceCourt) || sPlayers[0];
      receivingPlayer = rPlayers.find(p => (state.playerLocations[p.id] || state.playerLocations[p.name] || state.playerLocations[p.rawName]) === receiverCourt) || rPlayers[0];
    } else {
      servingPlayer = sPlayers[0];
      receivingPlayer = rPlayers[0];
    }

    const servingBoxName = getScreenBox(sSide, serviceCourt);
    const targetBoxName = getDiagonalReceiverBox(servingBoxName);
    const callText = `${state.scores[sTeam]} - ${state.scores[rTeam]}`;

    return {
      servingPlayer,
      receivingPlayer,
      serviceCourt,
      receiverCourt,
      servingBoxName,
      targetBoxName,
      callText
    };
  }
};

/**
 * 3. FALLBACK ADAPTER (Tennis, Squash, Table Tennis)
 */
export const FallbackAdapter = {
  sport: 'fallback',

  init({ format = 'DOUBLES', sport = 'tennis', teamA, teamB, lineup, startingServingTeam = 'teamA' }) {
    const isDoubles = String(format).toUpperCase() !== 'SINGLES';
    const playersA = isDoubles
      ? [
          normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name ? `${teamA.name} 1` : 'A1', 'RIGHT'),
          normalizePlayer(lineup?.teamA?.[1], 'A2', teamA?.name ? `${teamA.name} 2` : 'A2', 'LEFT')
        ]
      : [normalizePlayer(lineup?.teamA?.[0], 'A1', teamA?.name || 'A1', 'RIGHT')];

    const playersB = isDoubles
      ? [
          normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name ? `${teamB.name} 1` : 'B1', 'RIGHT'),
          normalizePlayer(lineup?.teamB?.[1], 'B2', teamB?.name ? `${teamB.name} 2` : 'B2', 'LEFT')
        ]
      : [normalizePlayer(lineup?.teamB?.[0], 'B1', teamB?.name || 'B1', 'RIGHT')];

    const playerLocations = {};
    playerLocations[playersA[0].id] = 'RIGHT';
    if (isDoubles) playerLocations[playersA[1].id] = 'LEFT';
    playerLocations[playersB[0].id] = 'RIGHT';
    if (isDoubles) playerLocations[playersB[1].id] = 'LEFT';

    return {
      sport: sport || 'court',
      format: isDoubles ? 'DOUBLES' : 'SINGLES',
      scoringMode: 'RALLY',
      scores: { teamA: 0, teamB: 0 },
      servingTeam: startingServingTeam === 'teamB' ? 'teamB' : 'teamA',
      serverNumber: 1,
      playersA,
      playersB,
      isLineupSetA: Boolean(lineup?.teamA && lineup.teamA.length > 0 && !playersA[0].isTBA),
      isLineupSetB: Boolean(lineup?.teamB && lineup.teamB.length > 0 && !playersB[0].isTBA),
      playerLocations,
      teamSides: { teamA: 'LEFT', teamB: 'RIGHT' },
      isSideOut: false,
      isServerChange: false,
      isPointScored: false,
      scoringTeam: null,
      movingPlayerIds: []
    };
  },

  applyPoint(state, pointTo) {
    const winningTeam = pointTo === 'teamB' ? 'teamB' : 'teamA';
    const newScores = { ...state.scores };
    newScores[winningTeam] += 1;
    return {
      ...state,
      scores: newScores,
      isPointScored: true,
      scoringTeam: winningTeam,
      movingPlayerIds: []
    };
  },

  deriveGeometry(state) {
    const sTeam = state.servingTeam;
    const rTeam = sTeam === 'teamA' ? 'teamB' : 'teamA';
    const sSide = state.teamSides[sTeam];
    const sScore = state.scores[sTeam];
    const serviceCourt = sScore % 2 === 0 ? 'RIGHT' : 'LEFT';
    const receiverCourt = serviceCourt;

    const sPlayers = sTeam === 'teamA' ? state.playersA : state.playersB;
    const rPlayers = rTeam === 'teamA' ? state.playersA : state.playersB;

    const servingPlayer = sPlayers[0];
    const receivingPlayer = rPlayers[0];

    const servingBoxName = getScreenBox(sSide, serviceCourt);
    const targetBoxName = getDiagonalReceiverBox(servingBoxName);
    const callText = `${state.scores[sTeam]} - ${state.scores[rTeam]}`;

    return {
      servingPlayer,
      receivingPlayer,
      serviceCourt,
      receiverCourt,
      servingBoxName,
      targetBoxName,
      callText
    };
  }
};

/**
 * Returns the matching adapter for a given sport slug.
 */
export function getSportAdapter(sport) {
  const s = String(sport || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'pickleball') return PickleballAdapter;
  if (s === 'badminton') return BadmintonAdapter;
  return FallbackAdapter;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE COURT STATE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the initial pure state from match configuration.
 */
export function getInitialCourtState(config = {}) {
  const sport = (config.sport || config.sportSlug || 'pickleball').toLowerCase();
  const adapter = getSportAdapter(sport);
  const initialState = adapter.init(config);
  initialState.isInitialStart = true;
  return finalizeCourtState(initialState, adapter, config);
}

/**
 * Deterministically applies a single point or event to the state.
 */
export function applyPointToCourtState(prevState, pointEvent = {}, config = {}) {
  const sport = prevState.sport || config.sport || 'pickleball';
  const adapter = getSportAdapter(sport);

  const pointTo = typeof pointEvent === 'string'
    ? pointEvent
    : (pointEvent.pointTo || pointEvent.scoringTeam || (pointEvent.team === 'A' || pointEvent.point_to === 'team_a' ? 'teamA' : 'teamB'));
  const steppedState = adapter.applyPoint(prevState, pointTo);
  steppedState.isInitialStart = false;
  steppedState.eventSeq = pointEvent.seq || pointEvent.eventSeq || (prevState.eventSeq || 0) + 1;
  steppedState.lastPointEvent = pointEvent;

  return finalizeCourtState(steppedState, adapter, config);
}

/**
 * Full History Replay: Evaluates court state deterministically from point history.
 * Ensures Undo, Reconnection, and Page Reload always produce the identical authoritative state!
 */
export function computeCourtStateFromHistory(config = {}, history = []) {
  const sport = (config.sport || config.sportSlug || 'pickleball').toLowerCase();
  const adapter = getSportAdapter(sport);
  const hasHistory = Array.isArray(history) && history.length > 0;
  const initialConfig = hasHistory ? {
    ...config,
    scores: { teamA: 0, teamB: 0 },
    servePoints: { teamA: 0, teamB: 0 },
    playerLocations: null
  } : config;
  let state = adapter.init(initialConfig);
  state.isInitialStart = !hasHistory;

  if (hasHistory) {
    // Sort chronologically by sequence_number or created_at
    const sorted = [...history].sort((a, b) => {
      const seqA = a.sequence_number ?? a.seq ?? a.eventSeq ?? 0;
      const seqB = b.sequence_number ?? b.seq ?? b.eventSeq ?? 0;
      return seqA - seqB;
    });

    for (let i = 0; i < sorted.length; i++) {
      const evt = sorted[i];
      if (evt.event_type === 'CORRECTION') {
        state.scores.teamA = evt.team_a_score ?? state.scores.teamA;
        state.scores.teamB = evt.team_b_score ?? state.scores.teamB;
        state.eventSeq = evt.sequence_number ?? evt.seq ?? (i + 1);
        if (state.scoringMode === 'SIDE_OUT' && state.format === 'DOUBLES' && state.originalPlayerPositions) {
          const posA = calculatePickleballDoublesPositions(state.scores.teamA, state.originalPlayerPositions.teamA);
          const posB = calculatePickleballDoublesPositions(state.scores.teamB, state.originalPlayerPositions.teamB);
          state.playerLocations = { ...state.playerLocations, ...posA, ...posB };
        }
        continue;
      }

      const isTeamB = evt.point_to === 'team_b' || 
                      evt.point_to === 'teamB' || 
                      evt.pointTo === 'teamB' || 
                      evt.team === 'B' || 
                      evt.team === 'teamB' ||
                      (Boolean(evt.team_id) && Boolean(config.teamB?.id) && evt.team_id === config.teamB.id) ||
                      (Boolean(evt.team_id) && Boolean(config.teamB?.internalId) && evt.team_id === config.teamB.internalId) ||
                      (Boolean(evt.teamId) && Boolean(config.teamB?.id) && evt.teamId === config.teamB.id) ||
                      (Boolean(evt.teamId) && Boolean(config.teamB?.internalId) && evt.teamId === config.teamB.internalId) ||
                      (typeof evt.payload === 'object' && (evt.payload?.scoringSide === 'B' || evt.payload?.scoringTeam === 'teamB')) ||
                      (typeof evt.payload === 'string' && (evt.payload.includes('"scoringSide":"B"') || evt.payload.includes('"scoringTeam":"teamB"')));
      const pointTo = isTeamB ? 'teamB' : 'teamA';
      state = adapter.applyPoint(state, pointTo);
      state.isInitialStart = false;
      state.eventSeq = evt.sequence_number ?? evt.seq ?? (i + 1);
    }
  }

  return finalizeCourtState(state, adapter, config);
}

/**
 * Helper to compute full render-ready court state with player markers, badges, and boxes.
 */
export function finalizeCourtState(state, adapter, config = {}) {
  const derived = adapter.deriveGeometry(state);

  const teamA = config.teamA || { id: 'teamA', name: 'Team A' };
  const teamB = config.teamB || { id: 'teamB', name: 'Team B' };

  const sTeam = state.servingTeam;
  const rTeam = sTeam === 'teamA' ? 'teamB' : 'teamA';
  const serverTeamObj = sTeam === 'teamA' ? teamA : teamB;
  const receiverTeamObj = rTeam === 'teamA' ? teamA : teamB;

  // Build 4 Player (or 2 Player) Markers
  const players = [];
  const allPlayerObjs = [...state.playersA, ...state.playersB];

  for (const p of allPlayerObjs) {
    const isTeamA = state.playersA.some(pa => pa.id === p.id || pa.name === p.name);
    const pTeamKey = isTeamA ? 'teamA' : 'teamB';
    const pTeamSide = state.teamSides[pTeamKey]; // 'LEFT' or 'RIGHT'
    const court = state.playerLocations[p.id] || state.playerLocations[p.name] || state.playerLocations[p.rawName] || p.startCourt || 'RIGHT'; // 'RIGHT' or 'LEFT'
    const boxName = getScreenBox(pTeamSide, court);
    const coords = PLAYER_REST_COORDINATES[boxName] || { x: 75, y: 115 };

    const isServer = (derived.servingPlayer?.id === p.id) || (derived.servingPlayer?.name && derived.servingPlayer.name === p.name);
    const isReceiver = (derived.receivingPlayer?.id === p.id) || (derived.receivingPlayer?.name && derived.receivingPlayer.name === p.name);

    const isLineupSet = isTeamA ? state.isLineupSetA : state.isLineupSetB;
    const teamName = isTeamA ? teamA.name : teamB.name;

    // Display Name: Real player name if lineup set, else team name with quiet "Lineup TBA"
    const displayName = isLineupSet && !p.isTBA ? p.name : `${teamName}`;
    const secondaryLabel = isLineupSet && !p.isTBA ? (p.role || '') : 'Lineup TBA';

    players.push({
      id: p.id,
      name: displayName,
      rawName: p.name,
      secondaryLabel,
      isTBA: !isLineupSet || p.isTBA,
      team: pTeamKey,
      teamName,
      side: pTeamSide,
      court,
      boxName,
      x: coords.x,
      y: coords.y,
      isServer,
      isReceiver,
      serverNumber: isServer ? state.serverNumber : null,
      initials: isLineupSet && !p.isTBA ? p.initials : `${teamName.slice(0, 1).toUpperCase()}${court === 'RIGHT' ? '1' : '2'}`,
      isMoving: state.movingPlayerIds.includes(p.id)
    });
  }

  // Active serving & target boxes
  const servingBoxName = derived.servingBoxName;
  const targetBoxName = derived.targetBoxName;
  const serverCoords = BOX_COORDINATES[servingBoxName] || { x: 170, y: 285 };
  const receiverCoords = BOX_COORDINATES[targetBoxName] || { x: 630, y: 115 };

  // Ball resting position at server's racket
  const ballCoords = {
    x: servingBoxName.includes('left') ? 100 : 700,
    y: serverCoords.y
  };

  // Game/Match Status
  const targetScore = config.targetScore || 11;
  const winByTwo = config.winByTwo !== false;
  const scoreA = state.scores.teamA;
  const scoreB = state.scores.teamB;

  let gameStatus = 'LIVE';
  let winner = null;

  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  const diff = maxScore - minScore;

  if (maxScore >= targetScore && (!winByTwo || diff >= 2)) {
    gameStatus = 'COMPLETED';
    winner = scoreA > scoreB ? 'teamA' : 'teamB';
  } else if (maxScore >= targetScore - 1 && (!winByTwo || diff >= 1)) {
    gameStatus = 'GAME_POINT';
  }

  return {
    ...state,
    teamA,
    teamB,
    scoreA: state.scores.teamA,
    scoreB: state.scores.teamB,
    servingPlayer: derived.servingPlayer,
    receivingPlayer: derived.receivingPlayer,
    serviceCourt: derived.serviceCourt,
    receiverCourt: derived.receiverCourt,
    servingBoxName,
    targetBoxName,
    serverTeam: serverTeamObj,
    receiverTeam: receiverTeamObj,
    serverTeamName: serverTeamObj.name,
    receiverTeamName: receiverTeamObj.name,
    serverCoords,
    receiverCoords,
    defaultBallCoords: ballCoords,
    ballCoords,
    arrowPath: `M ${serverCoords.x} ${serverCoords.y} Q 400 200 ${receiverCoords.x} ${receiverCoords.y}`,
    arrowStart: serverCoords,
    arrowEnd: receiverCoords,
    players,
    callText: derived.callText,
    gameStatus,
    winner,
    isGamePoint: gameStatus === 'GAME_POINT',
    isMatchWon: gameStatus === 'COMPLETED',
    eventSeq: state.eventSeq || 0
  };
}

/**
 * CommonJS export bridge for Node.js test runners and backend services.
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COURT_BOXES,
    BOX_COORDINATES,
    PLAYER_REST_COORDINATES,
    BOX_RECTS,
    getScreenBox,
    getDiagonalReceiverBox,
    extractInitials,
    PickleballAdapter,
    BadmintonAdapter,
    FallbackAdapter,
    getSportAdapter,
    getInitialCourtState,
    applyPointToCourtState,
    computeCourtStateFromHistory
  };
}
