/**
 * Centralized Sport Roles Configuration
 * 
 * Single source of truth for sport positions, role captions, badges, icons,
 * and category filtering across Team Roster views, Add/Edit Player forms,
 * and tournament squad management.
 */

export const SPORT_ROLES = {
  cricket: [
    {
      id: 'Batsman',
      label: 'Batsman',
      shortLabel: 'BAT',
      category: 'Batters',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏏'
    },
    {
      id: 'Bowler',
      label: 'Bowler',
      shortLabel: 'BOWL',
      category: 'Bowlers',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      icon: '🎯'
    },
    {
      id: 'All-Rounder',
      label: 'All-Rounder',
      shortLabel: 'AR',
      category: 'All-Rounders',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      icon: '⚡'
    },
    {
      id: 'Wicketkeeper',
      label: 'Wicketkeeper',
      shortLabel: 'WK',
      category: 'Wicketkeepers',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '🧤'
    },
    {
      id: 'Wicketkeeper-Batsman',
      label: 'Wicketkeeper-Batsman',
      shortLabel: 'WK-BAT',
      category: 'Wicketkeepers',
      badgeColor: '#0d9488',
      badgeBg: 'rgba(13, 148, 136, 0.15)',
      borderColor: 'rgba(13, 148, 136, 0.35)',
      icon: '🧤'
    }
  ],

  football: [
    {
      id: 'Goalkeeper',
      label: 'Goalkeeper',
      shortLabel: 'GK',
      category: 'Goalkeepers',
      badgeColor: '#d97706',
      badgeBg: 'rgba(217, 119, 6, 0.15)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      icon: '🧤'
    },
    {
      id: 'Defender',
      label: 'Defender',
      shortLabel: 'DEF',
      category: 'Defenders',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🛡️'
    },
    {
      id: 'Midfielder',
      label: 'Midfielder',
      shortLabel: 'MID',
      category: 'Midfielders',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '⚙️'
    },
    {
      id: 'Forward',
      label: 'Forward',
      shortLabel: 'FWD',
      category: 'Forwards',
      badgeColor: '#e11d48',
      badgeBg: 'rgba(225, 29, 72, 0.15)',
      borderColor: 'rgba(225, 29, 72, 0.35)',
      icon: '⚽'
    },
    {
      id: 'Striker',
      label: 'Striker',
      shortLabel: 'ST',
      category: 'Forwards',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      icon: '🎯'
    }
  ],

  badminton: [
    {
      id: 'Singles Player',
      label: 'Singles Player',
      shortLabel: 'SGL',
      category: 'Singles',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏸'
    },
    {
      id: 'Doubles Player',
      label: 'Doubles Player',
      shortLabel: 'DBL',
      category: 'Doubles',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '👥'
    },
    {
      id: 'Substitute',
      label: 'Substitute',
      shortLabel: 'SUB',
      category: 'Substitutes',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '🔄'
    }
  ],

  tennis: [
    {
      id: 'Singles Player',
      label: 'Singles Player',
      shortLabel: 'SGL',
      category: 'Singles',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🎾'
    },
    {
      id: 'Doubles Player',
      label: 'Doubles Player',
      shortLabel: 'DBL',
      category: 'Doubles',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '👥'
    },
    {
      id: 'Substitute',
      label: 'Substitute',
      shortLabel: 'SUB',
      category: 'Substitutes',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '🔄'
    }
  ],

  pickleball: [
    {
      id: 'Singles Player',
      label: 'Singles Player',
      shortLabel: 'SGL',
      category: 'Singles',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏓'
    },
    {
      id: 'Doubles Player',
      label: 'Doubles Player',
      shortLabel: 'DBL',
      category: 'Doubles',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '👥'
    },
    {
      id: 'Substitute',
      label: 'Substitute',
      shortLabel: 'SUB',
      category: 'Substitutes',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '🔄'
    }
  ],

  'table-tennis': [
    {
      id: 'Singles Player',
      label: 'Singles Player',
      shortLabel: 'SGL',
      category: 'Singles',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏓'
    },
    {
      id: 'Doubles Player',
      label: 'Doubles Player',
      shortLabel: 'DBL',
      category: 'Doubles',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '👥'
    },
    {
      id: 'Substitute',
      label: 'Substitute',
      shortLabel: 'SUB',
      category: 'Substitutes',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '🔄'
    }
  ],

  basketball: [
    {
      id: 'Point Guard',
      label: 'Point Guard',
      shortLabel: 'PG',
      category: 'Guards',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏀'
    },
    {
      id: 'Shooting Guard',
      label: 'Shooting Guard',
      shortLabel: 'SG',
      category: 'Guards',
      badgeColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.15)',
      borderColor: 'rgba(2, 132, 199, 0.35)',
      icon: '🎯'
    },
    {
      id: 'Small Forward',
      label: 'Small Forward',
      shortLabel: 'SF',
      category: 'Forwards',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '⚡'
    },
    {
      id: 'Power Forward',
      label: 'Power Forward',
      shortLabel: 'PF',
      category: 'Forwards',
      badgeColor: '#d97706',
      badgeBg: 'rgba(217, 119, 6, 0.15)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      icon: '💪'
    },
    {
      id: 'Center',
      label: 'Center',
      shortLabel: 'C',
      category: 'Centers',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      icon: '🏰'
    }
  ],

  volleyball: [
    {
      id: 'Setter',
      label: 'Setter',
      shortLabel: 'SET',
      category: 'Setters',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🏐'
    },
    {
      id: 'Outside Hitter',
      label: 'Outside Hitter',
      shortLabel: 'OH',
      category: 'Hitters',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      icon: '⚡'
    },
    {
      id: 'Opposite Hitter',
      label: 'Opposite Hitter',
      shortLabel: 'OPP',
      category: 'Hitters',
      badgeColor: '#ea580c',
      badgeBg: 'rgba(234, 88, 12, 0.15)',
      borderColor: 'rgba(234, 88, 12, 0.35)',
      icon: '🔥'
    },
    {
      id: 'Middle Blocker',
      label: 'Middle Blocker',
      shortLabel: 'MB',
      category: 'Blockers',
      badgeColor: '#059669',
      badgeBg: 'rgba(5, 150, 105, 0.15)',
      borderColor: 'rgba(5, 150, 105, 0.35)',
      icon: '🛡️'
    },
    {
      id: 'Libero',
      label: 'Libero',
      shortLabel: 'LIB',
      category: 'Liberos',
      badgeColor: '#d97706',
      badgeBg: 'rgba(217, 119, 6, 0.15)',
      borderColor: 'rgba(217, 119, 6, 0.35)',
      icon: '🧤'
    },
    {
      id: 'Defensive Specialist',
      label: 'Defensive Specialist',
      shortLabel: 'DS',
      category: 'Defense',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '⚓'
    }
  ],

  kabaddi: [
    {
      id: 'Raider',
      label: 'Raider',
      shortLabel: 'RAID',
      category: 'Raiders',
      badgeColor: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.15)',
      borderColor: 'rgba(220, 38, 38, 0.35)',
      icon: '🏃'
    },
    {
      id: 'Corner Defender',
      label: 'Corner Defender',
      shortLabel: 'CRN',
      category: 'Defenders',
      badgeColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.35)',
      icon: '🛡️'
    },
    {
      id: 'Cover Defender',
      label: 'Cover Defender',
      shortLabel: 'COV',
      category: 'Defenders',
      badgeColor: '#0284c7',
      badgeBg: 'rgba(2, 132, 199, 0.15)',
      borderColor: 'rgba(2, 132, 199, 0.35)',
      icon: '🛡️'
    },
    {
      id: 'All-Rounder',
      label: 'All-Rounder',
      shortLabel: 'AR',
      category: 'All-Rounders',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      icon: '⚡'
    }
  ],

  default: [
    {
      id: 'Player',
      label: 'Player',
      shortLabel: 'PL',
      category: 'Players',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.15)',
      borderColor: 'rgba(100, 116, 139, 0.35)',
      icon: '👤'
    }
  ]
};

export const CRICKET_EXTRAS = {
  battingHands: ['Right-hand bat', 'Left-hand bat'],
  bowlingStyles: [
    'Right-arm fast',
    'Right-arm medium',
    'Right-arm off-spin',
    'Right-arm leg-spin',
    'Left-arm fast',
    'Left-arm orthodox',
    'Left-arm chinaman'
  ]
};

/**
 * Normalizes input sport (string or object) into a recognized slug
 */
export function normalizeSportSlug(sport) {
  if (!sport) return 'default';
  if (typeof sport === 'object') {
    return (sport.slug || sport.name || '').toLowerCase().trim();
  }
  const clean = String(sport).toLowerCase().trim();
  if (clean.includes('cricket')) return 'cricket';
  if (clean.includes('football') || clean.includes('soccer')) return 'football';
  if (clean.includes('badminton')) return 'badminton';
  if (clean.includes('tennis') && !clean.includes('table')) return 'tennis';
  if (clean.includes('table') || clean.includes('ping')) return 'table-tennis';
  if (clean.includes('pickleball')) return 'pickleball';
  if (clean.includes('basketball')) return 'basketball';
  if (clean.includes('volleyball')) return 'volleyball';
  if (clean.includes('kabaddi')) return 'kabaddi';
  return clean || 'default';
}

/**
 * Returns list of roles for a given sport slug (with fallback)
 */
export function getSportRoles(sport) {
  const slug = normalizeSportSlug(sport);
  return SPORT_ROLES[slug] || SPORT_ROLES.default;
}

/**
 * Returns distinct category list for filter chips (e.g. ['All', 'Batters', 'Bowlers'...])
 */
export function getRoleCategories(sport) {
  const roles = getSportRoles(sport);
  const categories = ['All'];
  roles.forEach(r => {
    if (r.category && !categories.includes(r.category)) {
      categories.push(r.category);
    }
  });
  return categories;
}

/**
 * Resolves a role configuration safely, matching case-insensitively or falling back to "Player"
 */
export function getRoleConfig(sport, roleName) {
  const roles = getSportRoles(sport);
  if (!roleName || typeof roleName !== 'string') {
    return {
      id: 'Player',
      label: 'Player',
      shortLabel: 'PL',
      category: 'Players',
      badgeColor: '#64748b',
      badgeBg: 'rgba(100, 116, 139, 0.12)',
      borderColor: 'rgba(100, 116, 139, 0.3)',
      icon: null,
      isFallback: true
    };
  }

  const cleanRole = roleName.trim().toLowerCase();
  const matched = roles.find(r => 
    r.id.toLowerCase() === cleanRole || 
    r.label.toLowerCase() === cleanRole ||
    r.shortLabel.toLowerCase() === cleanRole
  );

  if (matched) {
    return matched;
  }

  // Check across all sports in case a multi-sport player has a cross-sport role
  for (const sportKey of Object.keys(SPORT_ROLES)) {
    const crossMatch = SPORT_ROLES[sportKey].find(r => 
      r.id.toLowerCase() === cleanRole || 
      r.label.toLowerCase() === cleanRole
    );
    if (crossMatch) return crossMatch;
  }

  // Graceful fallback for custom or unknown roles
  return {
    id: roleName,
    label: roleName,
    shortLabel: roleName.slice(0, 3).toUpperCase(),
    category: 'Players',
    badgeColor: '#64748b',
    badgeBg: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    icon: null,
    isFallback: false
  };
}
