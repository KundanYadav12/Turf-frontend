'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../../services/socket';
import {
  X, CheckCircle, AlertCircle, RefreshCw, ShieldCheck,
  Video, Radio, Wifi, Database, Globe, Server, Lock
} from 'lucide-react';

export default function StreamingHealthModal({ isOpen, onClose, matchId }) {
  const [loading, setLoading] = useState(true);
  const [backendHealth, setBackendHealth] = useState(null);
  const [clientChecks, setClientChecks] = useState({
    secureContext: false,
    cameraSupported: false,
    cameraPermission: 'prompt',
    audioSupported: false,
    socketConnected: false,
    screenShareSupported: false
  });

  const runDiagnostics = async () => {
    setLoading(true);

    // 1. Client-side browser checks
    const isHttps = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hasMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasScreen = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    const isSocketConnected = Boolean(socket && socket.connected);

    let camPerm = 'unknown';
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const p = await navigator.permissions.query({ name: 'camera' });
        camPerm = p.state;
      } catch (e) {
        camPerm = 'prompt';
      }
    }

    setClientChecks({
      secureContext: isHttps,
      cameraSupported: hasMedia,
      cameraPermission: camPerm,
      audioSupported: hasMedia,
      socketConnected: isSocketConnected,
      screenShareSupported: hasScreen
    });

    // 2. Server-side backend diagnostics
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('turf_token') || localStorage.getItem('token'))
        : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const healthUrl = matchId
        ? `/api/matches/${matchId}/stream/health`
        : '/api/streams/health';

      const res = await axios.get(healthUrl, { headers });
      if (res.data?.success) {
        setBackendHealth(res.data.data);
      }
    } catch (err) {
      console.warn('[StreamingHealth] Backend check error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, matchId]);

  if (!isOpen) return null;

  const db = backendHealth?.database || {};
  const net = backendHealth?.networking || {};
  const env = backendHealth?.environment || {};

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 18,
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          padding: '1.75rem',
          color: '#ffffff'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Streaming Health & Diagnostics
              </h3>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                Super Admin Production System Verification
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                padding: '0.4rem 0.75rem',
                borderRadius: 8,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Recheck
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Diagnostic Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Section 1: Browser Context & Media */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> 1. Browser Secure Context & Device APIs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
              <StatusRow
                label="HTTPS / Secure Context"
                ok={clientChecks.secureContext}
                detail={clientChecks.secureContext ? 'Active (Required for Camera/Mic)' : 'Insecure HTTP Context'}
              />
              <StatusRow
                label="Camera / Mic APIs"
                ok={clientChecks.cameraSupported}
                detail={clientChecks.cameraSupported ? 'navigator.mediaDevices Supported' : 'Unsupported Browser'}
              />
              <StatusRow
                label="Camera Permission"
                ok={clientChecks.cameraPermission !== 'denied'}
                detail={`State: ${clientChecks.cameraPermission}`}
              />
              <StatusRow
                label="Screen Share (OBS/Tab)"
                ok={clientChecks.screenShareSupported}
                detail={clientChecks.screenShareSupported ? 'Supported' : 'Not Available on Mobile'}
              />
            </div>
          </div>

          {/* Section 2: Real-time Signaling & API */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={14} /> 2. Real-Time Signaling & REST API
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
              <StatusRow
                label="REST Stream API"
                ok={Boolean(backendHealth)}
                detail={backendHealth ? '200 OK Reachable' : 'Unavailable / Error'}
              />
              <StatusRow
                label="WebSocket / Socket.IO"
                ok={clientChecks.socketConnected}
                detail={clientChecks.socketConnected ? 'Connected (Signaling Active)' : 'Connecting / Disconnected'}
              />
              <StatusRow
                label="STUN Servers"
                ok={Boolean(net.stunAvailable)}
                detail={`${net.iceServersConfiguredCount || 0} ICE Server(s) Configured`}
              />
              <StatusRow
                label="TURN Relay Server"
                ok={Boolean(net.turnAvailable)}
                detail={net.turnAvailable ? 'Configured' : 'Using Google STUN (Public)'}
                warning={!net.turnAvailable}
              />
            </div>
          </div>

          {/* Section 3: Database Tables & Schema */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={14} /> 3. Database Schema Verification
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
              <StatusRow
                label="match_streams Table"
                ok={Boolean(db.matchStreamsTable)}
                detail={db.matchStreamsTable ? 'Verified Present' : 'MISSING (Run Migration)'}
              />
              <StatusRow
                label="tournament_stream_permissions"
                ok={Boolean(db.tournamentStreamPermissionsTable)}
                detail={db.tournamentStreamPermissionsTable ? 'Verified Present' : 'MISSING (Run Migration)'}
              />
              <StatusRow
                label="has_live_stream Column"
                ok={Boolean(db.hasLiveStreamColumn)}
                detail={db.hasLiveStreamColumn ? 'tournament_matches.has_live_stream OK' : 'MISSING'}
              />
              <StatusRow
                label="Recorded Streams"
                ok={true}
                detail={`${db.totalStreamsRecorded || 0} total (${db.currentlyLiveStreams || 0} Live now)`}
              />
            </div>
          </div>

          {/* Section 4: Production Media Ingest Endpoints */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              padding: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Server size={14} /> 4. Media Ingest & Playback Config
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <div>
                <strong style={{ color: '#cbd5e1' }}>RTMP Ingest:</strong>{' '}
                <code>{net.rtmpIngestUrlConfigured || 'rtmp://playzo.duckdns.org/live'}</code>
              </div>
              <div>
                <strong style={{ color: '#cbd5e1' }}>HLS Playback:</strong>{' '}
                <code>{net.hlsPlaybackUrlConfigured || 'https://playzo.duckdns.org/hls'}</code>
              </div>
              <div>
                <strong style={{ color: '#cbd5e1' }}>YouTube OAuth:</strong>{' '}
                <span style={{ color: env.YOUTUBE_OAUTH_CONFIGURED ? '#10b981' : '#f59e0b' }}>
                  {env.YOUTUBE_OAUTH_CONFIGURED ? 'API Configured' : 'Direct Link Mode (Ready)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              fontWeight: 700
            }}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, detail, warning = false }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '0.45rem 0.65rem',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {ok ? (
        <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
      ) : warning ? (
        <AlertCircle size={15} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
      ) : (
        <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
      )}
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.8rem' }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: ok ? '#94a3b8' : '#f87171', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {detail}
        </div>
      </div>
    </div>
  );
}
