import React from 'react';

export const metadata = {
  title: 'Smart TV Mode & Live Stadium Scoreboard | TurfSpot',
  description: 'Full-screen landscape Smart TV live scoreboard, multi-match symmetrical arrangements, scene rotation, and stadium signage.',
  robots: {
    index: false,
    follow: true,
  }
};

export default function TVLayout({ children }) {
  return (
    <div style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#090d16', minHeight: 0, height: '100dvh', width: '100vw', maxHeight: '100dvh', overscrollBehavior: 'none' }}>
      {children}
    </div>
  );
}
