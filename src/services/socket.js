import { io } from 'socket.io-client';

let socketInstance = null;

const createSocket = () => {
  if (typeof window === 'undefined') {
    return {
      connected: false,
      on: () => {},
      off: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {}
    };
  }

  if (!socketInstance) {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';

    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '5008';
    const SOCKET_URL = isLocal
      ? `http://${window.location.hostname}:${backendPort}`
      : window.location.origin;

    socketInstance = io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      upgrade: true
    });

    // Gracefully handle browser Back-Forward Cache (bfcache)
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', (event) => {
        if (event.persisted && socketInstance && !socketInstance.connected) {
          socketInstance.connect();
        }
      });
    }
  }

  return socketInstance;
};

// Export proxy object that forwards to active socket instance
export const socket = new Proxy({}, {
  get(target, prop) {
    const active = createSocket();
    const val = active[prop];
    if (typeof val === 'function') {
      return val.bind(active);
    }
    return val;
  }
});

export default socket;
