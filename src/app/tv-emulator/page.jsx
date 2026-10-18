'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function TVEmulatorPage() {
  const [platform, setPlatform] = useState('android');
  const [resolution, setResolution] = useState('1080p');
  const [viewSource, setViewSource] = useState('/tv/tv_arena_main_01');
  const [isPowered, setIsPowered] = useState(true);
  const [telemetry, setTelemetry] = useState('DEVICE READY: Android TV (Leanback)');
  const iframeRef = useRef(null);

  const getDimensions = () => {
    switch (resolution) {
      case '720p':
        return { w: 1280, h: 720, aspect: '16/9' };
      case '4k':
        return { w: 3840, h: 2160, aspect: '16/9' };
      case 'ultrawide':
        return { w: 2560, h: 1080, aspect: '21/9' };
      case '1080p':
      default:
        return { w: 1920, h: 1080, aspect: '16/9' };
    }
  };

  const dims = getDimensions();

  const sendKey = (key, keyCode, androidCode) => {
    if (!isPowered || !iframeRef.current) return;
    try {
      const iframe = iframeRef.current;
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument || win.document;

      const evt = new KeyboardEvent('keydown', {
        key: key,
        code: key,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true
      });

      win.dispatchEvent(evt);
      doc.dispatchEvent(evt);

      setTelemetry(`DISPATCHED: [${key}] (KeyCode: ${keyCode}) to ${platform.toUpperCase()}`);
    } catch (e) {
      setTelemetry(`EVENT: ${key} clicked`);
    }
  };

  const handleBackKey = () => {
    if (platform === 'tizen') {
      sendKey('Escape', 10009, 4);
    } else if (platform === 'webos') {
      sendKey('Escape', 461, 4);
    } else {
      sendKey('Escape', 27, 4);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 20%, #151f38, #070a12)',
      color: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Top Header Controls */}
      <header
        suppressHydrationWarning
        style={{
          height: '56px',
          background: '#131b2e',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          gap: '1.25rem',
          zIndex: 50,
          flexShrink: 0,
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: '#000',
            fontWeight: 900,
            fontSize: '0.78rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.5px'
          }}>
            TURF TV EMULATOR
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
            Smart TV Hardware Device Simulator
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Platform Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flexShrink: 0 }}>
            <label htmlFor="emulator-platform-select" style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>Platform:</label>
            <select
              id="emulator-platform-select"
              suppressHydrationWarning
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setTelemetry(`PLATFORM SWITCHED: ${e.target.value.toUpperCase()}`);
              }}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.22)',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="android" style={{ background: '#1e293b', color: '#ffffff' }}>🤖 Android TV / Fire TV</option>
              <option value="tizen" style={{ background: '#1e293b', color: '#ffffff' }}>🟦 Samsung Smart TV (Tizen)</option>
              <option value="webos" style={{ background: '#1e293b', color: '#ffffff' }}>🔴 LG Smart TV (webOS)</option>
            </select>
          </div>

          {/* Resolution Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flexShrink: 0 }}>
            <label htmlFor="emulator-resolution-select" style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>Resolution:</label>
            <select
              id="emulator-resolution-select"
              suppressHydrationWarning
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.22)',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="1080p" style={{ background: '#1e293b', color: '#ffffff' }}>1080p Full HD (1920×1080)</option>
              <option value="720p" style={{ background: '#1e293b', color: '#ffffff' }}>720p HD Ready (1280×720)</option>
              <option value="4k" style={{ background: '#1e293b', color: '#ffffff' }}>4K Ultra HD (3840×2160)</option>
              <option value="ultrawide" style={{ background: '#1e293b', color: '#ffffff' }}>21:9 Ultrawide (2560×1080)</option>
            </select>
          </div>

          {/* Source Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flexShrink: 0 }}>
            <label htmlFor="emulator-display-select" style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>Display URL:</label>
            <select
              id="emulator-display-select"
              suppressHydrationWarning
              value={viewSource}
              onChange={(e) => setViewSource(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.22)',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '245px'
              }}
            >
              <option value="/tv/tv_arena_main_01" style={{ background: '#1e293b', color: '#ffffff' }}>Main Arena TV (/tv/tv_arena_main_01)</option>
              <option value="/tv/tv_court_01" style={{ background: '#1e293b', color: '#ffffff' }}>Court 1 TV (/tv/tv_court_01)</option>
              <option value="/tv/tv_court_02" style={{ background: '#1e293b', color: '#ffffff' }}>Court 2 TV (/tv/tv_court_02)</option>
              <option value="/tv" style={{ background: '#1e293b', color: '#ffffff' }}>Smart TV Pairing Hub (/tv)</option>
            </select>
          </div>

          <button
            id="emulator-btn-power"
            onClick={() => setIsPowered(!isPowered)}
            style={{
              background: isPowered ? '#dc2626' : '#10b981',
              color: '#fff',
              border: 'none',
              padding: '0.35rem 0.8rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {isPowered ? '⏻ Power Off' : '⏻ Power On'}
          </button>

          <Link
            id="emulator-btn-exit"
            href="/owner/dashboard"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.35rem 0.65rem',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            ← Exit to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Emulator Stage */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2.5rem',
        padding: '1.5rem 2rem',
        overflow: 'hidden'
      }}>
        {/* Physical TV Chassis Frame */}
        <div style={{
          flex: 1,
          maxWidth: '1200px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            aspectRatio: dims.aspect,
            background: '#181d28',
            border: '12px solid #283347',
            borderRadius: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 0 10px rgba(0,0,0,0.9)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Screen */}
            <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000', overflow: 'hidden' }}>
              {isPowered ? (
                <iframe
                  ref={iframeRef}
                  src={viewSource}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#07090e'
                  }}
                  title="Smart TV Display"
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                  TV POWER STANDBY
                </div>
              )}
            </div>

            {/* Chassis Bezel Footer */}
            <div style={{
              height: '22px',
              background: '#111622',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 1rem',
              borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>
                TURF CINEMA PRO OLED
              </span>
              <div style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isPowered ? '#10b981' : '#ef4444',
                boxShadow: `0 0 8px ${isPowered ? '#10b981' : '#ef4444'}`
              }} />
            </div>
          </div>

          {/* Stand Legs */}
          <div style={{ width: '70%', display: 'flex', justifyContent: 'space-between', marginTop: '-2px', zIndex: -1 }}>
            <div style={{ width: '80px', height: '28px', background: 'linear-gradient(180deg, #334155, #1e293b)', clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)' }} />
            <div style={{ width: '80px', height: '28px', background: 'linear-gradient(180deg, #334155, #1e293b)', clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)' }} />
          </div>
        </div>

        {/* Physical Smart TV Remote Controller */}
        <aside style={{
          width: '250px',
          background: 'linear-gradient(175deg, #1f293d, #121824)',
          border: '2px solid rgba(255,255,255,0.12)',
          borderRadius: '36px',
          padding: '1.4rem 1.1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.1rem',
          boxShadow: '0 20px 45px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2)',
          userSelect: 'none'
        }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '1.5px', color: '#10b981' }}>TURF TV REMOTE</span>
            <button
              onClick={() => setIsPowered(!isPowered)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                border: 'none',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(220,38,38,0.5)'
              }}
            >
              ⏻
            </button>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#94a3b8',
            textAlign: 'center',
            width: '100%'
          }}>
            MODE: {platform.toUpperCase()}
          </div>

          {/* D-PAD SPATIAL WHEEL */}
          <div style={{ width: '154px', height: '154px', position: 'relative', margin: '0.4rem 0' }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #2b3852, #1a2233)',
              border: '2px solid rgba(255,255,255,0.15)',
              position: 'relative',
              boxShadow: '0 6px 14px rgba(0,0,0,0.5)'
            }}>
              <button
                id="btn-remote-up"
                onClick={() => sendKey('ArrowUp', 38, 19)}
                style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', width: '44px', height: '32px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ▲
              </button>
              <button
                id="btn-remote-down"
                onClick={() => sendKey('ArrowDown', 40, 20)}
                style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', width: '44px', height: '32px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ▼
              </button>
              <button
                id="btn-remote-left"
                onClick={() => sendKey('ArrowLeft', 37, 21)}
                style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '44px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ◄
              </button>
              <button
                id="btn-remote-right"
                onClick={() => sendKey('ArrowRight', 39, 22)}
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '44px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.1rem', cursor: 'pointer' }}
              >
                ►
              </button>
              <button
                id="btn-remote-ok"
                onClick={() => sendKey('Enter', 13, 23)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  color: '#000',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)'
                }}
              >
                OK
              </button>
            </div>
          </div>

          {/* Navigation Action Buttons (Back, Home, Pause) */}
          <div style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
            <button
              id="btn-remote-back"
              onClick={handleBackKey}
              style={{
                flex: 1,
                height: '38px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>↩</span>
              <span>BACK</span>
            </button>
            <button
              id="btn-remote-home"
              onClick={() => {
                setViewSource('/tv/tv_arena_main_01');
                setTelemetry('HOME: Reloaded Main Display');
              }}
              style={{
                flex: 1,
                height: '38px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>⌂</span>
              <span>HOME</span>
            </button>
            <button
              id="btn-remote-pause"
              onClick={() => sendKey(' ', 32, 85)}
              style={{
                flex: 1,
                height: '38px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span>⏸</span>
              <span>PAUSE</span>
            </button>
          </div>

          {/* Quick Scene Buttons */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <button
              onClick={() => sendKey('ArrowRight', 39, 22)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.4rem',
                color: '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⏭ Next Scene
            </button>
            <button
              onClick={() => sendKey('ArrowLeft', 37, 21)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '0.4rem',
                color: '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⏮ Prev Scene
            </button>
          </div>

          {/* Utility Buttons: Theme & Refresh */}
          <div style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => sendKey('t', 84, 0)}
              style={{
                flex: 1,
                height: '34px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ☀️/🌙 THEME
            </button>
            <button
              onClick={() => sendKey('r', 82, 0)}
              style={{
                flex: 1,
                height: '34px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔄 SYNC
            </button>
            <button
              onClick={() => sendKey('f', 70, 0)}
              style={{
                flex: 1,
                height: '34px',
                background: '#27334a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⛶ FULL
            </button>
          </div>

          {/* Real-time Telemetry Event Log */}
          <div style={{
            width: '100%',
            background: '#090d15',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.65rem',
            color: '#10b981',
            minHeight: '38px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            lineHeight: 1.25,
            wordBreak: 'break-all'
          }}>
            <div>STATE: {isPowered ? 'TV POWER ON' : 'TV STANDBY'}</div>
            <div>{telemetry}</div>
          </div>
        </aside>
      </main>
    </div>
  );
}
