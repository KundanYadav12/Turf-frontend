import { useEffect, useRef } from 'react';
import { socket } from '../services/socket';

/**
 * Modern React Hook for Single Match Live Room Subscription.
 * - Subscribes strictly to `match:{matchId}` room
 * - Receives detailed ball-by-ball / scoring events
 * - Performs mandatory room cleanup on unmount or match change
 */
export const useMatchLive = (matchId, onBallEvent) => {
  const callbackRef = useRef(onBallEvent);

  useEffect(() => {
    callbackRef.current = onBallEvent;
  }, [onBallEvent]);

  useEffect(() => {
    if (!matchId) return;

    // 1. Join isolated match room
    socket.emit('join:match', { matchId });

    // 2. Handle granular ball/point event
    const handleEvent = (data) => {
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    };

    socket.on('match:ballEvent', handleEvent);

    // 3. MANDATORY CLEANUP: Leave room on unmount or match change
    return () => {
      socket.emit('leave:match', { matchId });
      socket.off('match:ballEvent', handleEvent);
    };
  }, [matchId]);
};
