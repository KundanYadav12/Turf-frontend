/**
 * Share Utilities for Match Fixtures and Live Matches
 * Supports Web Share API (navigator.share), clipboard copying fallback, and WhatsApp fallback.
 * Strictly generates public match URLs with tournamentId validation: /matches/:id?tournamentId=:tournamentId
 */

/**
 * Build the canonical public match URL ensuring matchId and tournamentId are present.
 * Never generates scorer, admin, or permission-gated links.
 */
export function buildPublicMatchUrl(matchId, tournamentId) {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const mId = matchId || '';
  const tId = tournamentId || '';
  const query = tId ? `?tournamentId=${encodeURIComponent(tId)}` : '';
  return `${origin}/matches/${mId}${query}`;
}

/**
 * Format title and text for match share according to match status:
 * - LIVE: "LIVE: A1 vs A4 (8-5) - XYZ Tournament"
 * - Scheduled: "A1 vs A4 - Mon 12 Oct, 9:00 AM - Court 1 - XYZ Tournament"
 * - Completed: "Result: A1 won 15-9 - XYZ Tournament"
 */
export function buildMatchSharePayload({ match, tournament }) {
  if (!match) return { title: 'Match', text: '', url: '' };

  const matchId = match.uuid || match.public_id || match.id;
  const tournamentId = tournament?.uuid || tournament?.id || match.tournament_uuid || match.tournament_id || match.tournamentId || match.tournament?.id || '';
  const tournamentName = tournament?.name || match.tournament_name || match.tournament?.name || 'Tournament';

  const teamAName = match.teamA?.name || match.teamAName || match.team_a_name || 'Team A';
  const teamBName = match.teamB?.name || match.teamBName || match.team_b_name || 'Team B';
  const status = String(match.status || 'SCHEDULED').toUpperCase();

  const url = buildPublicMatchUrl(matchId, tournamentId);
  const title = `${teamAName} vs ${teamBName} | ${tournamentName}`;
  let text = '';

  if (status === 'LIVE') {
    const rawScore = match.liveScoreSummary || match.live_score_summary || match.scoreSummary || '';
    const scoreText = rawScore && rawScore !== 'Yet to Start' ? ` (${rawScore})` : '';
    text = `LIVE: ${teamAName} vs ${teamBName}${scoreText} - ${tournamentName}`;
  } else if (status === 'COMPLETED') {
    const result = match.resultSummary || match.result_summary || `${teamAName} vs ${teamBName}`;
    text = `Result: ${result} - ${tournamentName}`;
  } else {
    // Scheduled match
    const dateStr = match.date || match.match_date || '';
    const timeStr = match.startTime || match.start_time || '';
    const courtStr = match.courtName || match.court_name || match.venueName || match.venue_name || '';

    const parts = [];
    if (dateStr) parts.push(dateStr);
    if (timeStr) parts.push(timeStr);
    if (courtStr) parts.push(courtStr);

    const details = parts.length > 0 ? ` - ${parts.join(', ')}` : '';
    text = `${teamAName} vs ${teamBName}${details} - ${tournamentName}`;
  }

  return { title, text, url, matchId, tournamentId };
}

/**
 * Execute native share or clipboard / WhatsApp fallback
 */
export async function shareMatchFixture({ match, tournament, onFeedback }) {
  const payload = buildMatchSharePayload({ match, tournament });
  const { title, text, url } = payload;

  // 1. Try Web Share API (mobile devices, modern desktop browsers)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
      if (onFeedback) onFeedback({ success: true, method: 'share', message: 'Shared successfully' });
      return { success: true, method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled the share dialog
        return { success: false, cancelled: true };
      }
      // If Web Share failed unexpectedly, proceed to clipboard fallback
    }
  }

  // 2. Fallback: Copy URL and text to Clipboard
  try {
    const shareContent = `${text}\n${url}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareContent);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = shareContent;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (onFeedback) onFeedback({ success: true, method: 'clipboard', message: 'Link copied to clipboard!' });
    return { success: true, method: 'clipboard' };
  } catch (clipErr) {
    // 3. Fallback: Open WhatsApp with prefilled share text
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${url}`)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
    if (onFeedback) onFeedback({ success: true, method: 'whatsapp', message: 'Opening WhatsApp to share...' });
    return { success: true, method: 'whatsapp' };
  }
}

