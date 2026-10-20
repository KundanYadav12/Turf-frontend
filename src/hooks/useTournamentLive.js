import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';

/**
 * Modern React Hook for Tournament Live Room Subscription.
 * - Subscribes strictly to `tournament:{tournamentId}` room
 * - Receives lightweight summary updates for live matches
 * - Performs mandatory room cleanup on unmount or tournament change
 */
export const useTournamentLive = (tournamentId, onMatchUpdated) => {
  const callbackRef = useRef(onMatchUpdated);

  // Keep latest callback reference without triggering re-subscription
  useEffect(() => {
    callbackRef.current = onMatchUpdated;
  }, [onMatchUpdated]);

  useEffect(() => {
    if (!tournamentId) return;

    // 1. Join isolated tournament room
    socket.emit('join:tournament', { tournamentId });

    // 2. Handle incoming lightweight match update
    const handleUpdate = (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    socket.on('tournament:matchUpdated', handleUpdate);
    socket.on('tournament:matchDisplayUpdated', handleUpdate);

    // 3. MANDATORY CLEANUP: Leave room on unmount or tournament change
    return () => {
      socket.emit('leave:tournament', { tournamentId });
      socket.off('tournament:matchUpdated', handleUpdate);
      socket.off('tournament:matchDisplayUpdated', handleUpdate);
    };
  }, [tournamentId]);
};
