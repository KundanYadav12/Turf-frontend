'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Tv, Monitor, Play, Pause, RefreshCw, Layout,
  Sliders, Save, Plus, Trash2, CheckCircle2, AlertCircle,
  ExternalLink, Eye, EyeOff, KeyRound, Sparkles, Loader2,
  Calendar, Table, Award, Flame, Zap, RotateCw
} from 'lucide-react';
import Link from 'next/link';

export default function TVDisplayManagementPanel() {
  const [displays, setDisplays] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDisplay, setSelectedDisplay] = useState(null);

  // Live Interactive Preview state
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [previewOrientation, setPreviewOrientation] = useState('LANDSCAPE'); // 'LANDSCAPE' | 'PORTRAIT'

  // Pairing code form state
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [pairingDisplayName, setPairingDisplayName] = useState('');
  const [pairingTournId, setPairingTournId] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  // Form saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('turf_token') || localStorage.getItem('token');
    return (t && t !== 'null' && t !== 'undefined') ? t : null;
  };

  const getAuthConfig = () => {
    const t = getAuthToken();
    return t ? { headers: { Authorization: `Bearer ${t}` } } : {};
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const authToken = getAuthToken();
      const displayPromise = authToken
        ? axios.get('/api/tv/displays', getAuthConfig())
        : Promise.resolve({ data: { success: true, data: [] } });

      const [dispRes, tournRes] = await Promise.all([
        displayPromise,
        axios.get('/api/tournaments')
      ]);

      if (dispRes.data.success) {
        setDisplays(dispRes.data.data);
        if (dispRes.data.data.length > 0) {
          // If none selected or previous selection updated
          setSelectedDisplay(prev => {
            if (!prev) return dispRes.data.data[0];
            const updated = dispRes.data.data.find(d => d.id === prev.id);
            return updated || dispRes.data.data[0];
          });
        }
      }

      if (tournRes.data.success) {
        setTournaments(tournRes.data.data.items || tournRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load TV displays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    if (!selectedDisplay) return;

    try {
      setIsSaving(true);
      setStatusMsg(null);
      const res = await axios.put(`/api/tv/displays/${selectedDisplay.id}`, selectedDisplay, getAuthConfig());
      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'Smart TV settings updated and broadcast live to televisions!' });
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to save TV config.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewDisplay = async () => {
    try {
      setIsCreating(true);
      setStatusMsg(null);
      const firstTourn = tournaments[0]?.id || null;
      const res = await axios.post('/api/tv/displays', {
        name: `Arena Smart TV ${displays.length + 1}`,
        tournamentId: firstTourn,
        layoutType: 'AUTO',
        matchCount: 4,
        rotationEnabled: true,
        rotationInterval: 15,
        activeScenes: ['SCOREBOARD', 'FIXTURES', 'STANDINGS', 'LEADERBOARD', 'SPONSORS', 'RESULTS'],
        adTopEnabled: true,
        adBottomEnabled: true,
        adSidebarsEnabled: true,
        theme: 'dark'
      }, getAuthConfig());

      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'New Smart TV display profile created!' });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to create display.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDisplay = async (id) => {
    if (!window.confirm('Are you sure you want to remove this TV display profile?')) return;

    try {
      setStatusMsg(null);
      const res = await axios.delete(`/api/tv/displays/${id}`, getAuthConfig());
      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'TV Display profile removed.' });
        setSelectedDisplay(null);
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to remove display.' });
    }
  };

  const handleClaimPairing = async (e) => {
    e.preventDefault();
    if (!pairingCodeInput.trim()) return;

    try {
      setIsPairing(true);
      setStatusMsg(null);
      const res = await axios.post('/api/tv/pair/claim', {
        pairingCode: pairingCodeInput.trim().toUpperCase(),
        name: pairingDisplayName || undefined,
        tournamentId: pairingTournId || undefined
      }, getAuthConfig());

      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'Television screen successfully paired and connected!' });
        setPairingCodeInput('');
        setPairingDisplayName('');
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Invalid or expired pairing code.' });
    } finally {
      setIsPairing(false);
    }
  };

  const toggleScene = (sceneName) => {
    if (!selectedDisplay) return;
    const current = selectedDisplay.activeScenes || ['SCOREBOARD', 'FIXTURES', 'STANDINGS', 'LEADERBOARD', 'SPONSORS', 'RESULTS'];
    const updated = current.includes(sceneName)
      ? current.filter(s => s !== sceneName)
      : [...current, sceneName];

    // Ensure at least 1 scene is selected
    if (updated.length === 0) return;
    setSelectedDisplay({ ...selectedDisplay, activeScenes: updated });
  };

  const allAvailableScenes = [
    { id: 'SCOREBOARD', label: 'Live Multi-Match Scoreboard', icon: <Tv size={14} /> },
    { id: 'FIXTURES', label: 'Upcoming Fixtures & Schedule', icon: <Calendar size={14} /> },
    { id: 'STANDINGS', label: 'Points Table & Standings', icon: <Table size={14} /> },
    { id: 'LEADERBOARD', label: 'Player Statistics & Awards', icon: <Flame size={14} /> },
    { id: 'SPONSORS', label: 'Sponsors & Brand Advertisers', icon: <Sparkles size={14} /> },
    { id: 'RESULTS', label: 'Recent Match Results', icon: <Award size={14} /> }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 14,
          border: '1px solid var(--border-glow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.5px' }}>
            Smart TV Broadcast Engine
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.2rem 0', color: 'var(--text-heading)' }}>
            Smart TV Displays &amp; Live Scoreboard Management
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Configure multi-match symmetrical layouts, automated scene rotations, and stadium advertisements for venue screens.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#10b981', color: '#10b981' }}
          >
            {showLivePreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showLivePreview ? 'Hide Live Preview' : 'Interactive Live Preview'}
          </button>
          <Link
            href="/tv-emulator"
            target="_blank"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#06b6d4', color: '#06b6d4' }}
          >
            <Tv size={15} /> 📺 TV Device Emulator
          </Link>
          <Link
            href="/tv"
            target="_blank"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Tv size={15} /> TV Hub / Quick Pairing
          </Link>
          {selectedDisplay && (
            <Link
              href={`/tv/${selectedDisplay.uuid}`}
              target="_blank"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', borderColor: '#10b981' }}
            >
              <ExternalLink size={15} /> Launch TV Fullscreen
            </Link>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 8,
            fontSize: '0.85rem',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: statusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: statusMsg.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* ── INTERACTIVE LIVE PREVIEW CONTAINER ── */}
      {showLivePreview && selectedDisplay && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: 14,
            border: '2px solid #10b981',
            background: 'rgba(15, 23, 42, 0.95)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#fff' }}>
                Simulated {previewOrientation === 'PORTRAIT' ? '9:16 Portrait' : '16:9 Landscape'} Smart TV: {selectedDisplay.name}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPreviewOrientation(prev => prev === 'LANDSCAPE' ? 'PORTRAIT' : 'LANDSCAPE')}
                className="btn btn-outline btn-xs"
                style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                title="Rotate TV Preview between Landscape and Portrait"
              >
                <RotateCw size={12} /> Rotate Preview ({previewOrientation === 'PORTRAIT' ? '9:16' : '16:9'})
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Orientation: <strong>{selectedDisplay.orientation || 'AUTO'}</strong> • Matches: <strong>{selectedDisplay.matchCount}</strong>
              </span>
            </div>
          </div>

          {/* Scaled Responsive TV Frame (Landscape 16:9 or Portrait 9:16) */}
          <div
            style={{
              position: 'relative',
              width: previewOrientation === 'PORTRAIT' ? '280px' : '100%',
              paddingTop: previewOrientation === 'PORTRAIT' ? '0' : '56.25%', // 16:9 Aspect Ratio
              height: previewOrientation === 'PORTRAIT' ? '498px' : 'auto',
              margin: previewOrientation === 'PORTRAIT' ? '0 auto' : '0',
              background: '#090d16',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <iframe
              src={`/tv/${selectedDisplay.uuid}`}
              title="TV Live Preview"
              style={{
                position: previewOrientation === 'PORTRAIT' ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                pointerEvents: 'auto'
              }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Display Selector & Configurator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Left: TV Displays List & Quick Pair */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Displays List */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Monitor size={16} color="#10b981" /> Configured TV Screens ({displays.length})
              </h3>
              <button
                onClick={handleCreateNewDisplay}
                disabled={isCreating}
                className="btn btn-outline btn-xs"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {isCreating ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}
                Add TV
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
              {displays.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDisplay(d)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    background: selectedDisplay?.id === d.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                    border: selectedDisplay?.id === d.id ? '1px solid #10b981' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Layout: <strong>{d.layoutType}</strong> • {d.tournamentName || 'Global Tournament'}
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    {d.isPaired ? 'Connected' : 'Unpaired'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Pair Box */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 14 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={16} color="#38bdf8" /> Pair a New Smart TV
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Open <strong>/tv</strong> on any Smart TV browser, then enter its 6-character pairing code below:
            </p>

            <form onSubmit={handleClaimPairing} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="6-Digit Code (e.g. 7K9X2B)"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value.toUpperCase())}
                className="input"
                maxLength={8}
                style={{ fontFamily: 'monospace', fontWeight: 800, textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px' }}
              />

              <input
                type="text"
                placeholder="TV Screen Name (e.g. Court 1 TV, Lounge Display)"
                value={pairingDisplayName}
                onChange={(e) => setPairingDisplayName(e.target.value)}
                className="input"
                style={{ fontSize: '0.85rem' }}
              />

              <button
                type="submit"
                disabled={isPairing || !pairingCodeInput.trim()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {isPairing ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                Pair Television Screen
              </button>
            </form>
          </div>
        </div>

        {/* Right: Selected Display Settings Form */}
        {selectedDisplay && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Settings: {selectedDisplay.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  UUID: <code>{selectedDisplay.uuid}</code>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleDeleteDisplay(selectedDisplay.id)}
                  title="Remove TV Display"
                  className="btn btn-outline btn-sm"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10b981', borderColor: '#10b981' }}
                >
                  {isSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Save &amp; Broadcast Live
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Display Name */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={selectedDisplay.name}
                  onChange={(e) => setSelectedDisplay({ ...selectedDisplay, name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Tournament Assignment */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                  Broadcast Tournament Feed
                </label>
                <select
                  value={selectedDisplay.tournamentId || ''}
                  onChange={(e) => setSelectedDisplay({ ...selectedDisplay, tournamentId: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">-- All Active Matches (Global Feed) --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Layout Engine & Orientation Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Multi-Match Layout Engine
                  </label>
                  <select
                    value={selectedDisplay.layoutType || 'AUTO'}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, layoutType: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="AUTO">AUTO (Responsive to match count)</option>
                    <option value="1_HERO">1 Match: Giant Stadium Hero</option>
                    <option value="2_SPLIT">2 Matches: 50-50 Split Panels</option>
                    <option value="3_BALANCED">3 Matches: 1 Featured + 2 Stacked</option>
                    <option value="4_GRID">4 Matches: 2x2 Symmetric Grid</option>
                    <option value="6_GRID">6 Matches: 3x2 Grid</option>
                    <option value="8_GRID">8 Matches: 4x2 Grid</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Display Orientation
                  </label>
                  <select
                    value={selectedDisplay.orientation || 'AUTO'}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, orientation: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="AUTO">AUTO (Detect from screen aspect ratio)</option>
                    <option value="LANDSCAPE">Landscape (16:9 Horizontal)</option>
                    <option value="PORTRAIT">Portrait (9:16 Vertical Signage/Totem)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Simultaneous Matches Count
                  </label>
                  <select
                    value={selectedDisplay.matchCount || 4}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, matchCount: parseInt(e.target.value, 10) })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    {[1, 2, 3, 4, 6, 8].map(n => (
                      <option key={n} value={n}>{n} Matches</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Portrait Sidebar Placement
                  </label>
                  <select
                    value={selectedDisplay.sidebarsMode || 'STRIP'}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, sidebarsMode: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="STRIP">Horizontal Sponsor Strips</option>
                    <option value="HIDDEN">Hide Sidebars in Portrait</option>
                  </select>
                </div>
              </div>

              {/* Completed Matches & Animation Speed */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Show Completed Matches
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer', marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDisplay.showCompletedMatches)}
                      onChange={(e) => setSelectedDisplay({ ...selectedDisplay, showCompletedMatches: e.target.checked })}
                    />
                    Keep grid populated if few live matches
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                    Animation Speed
                  </label>
                  <select
                    value={selectedDisplay.animationSpeed || 'normal'}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, animationSpeed: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="fast">Fast (Smooth High Refresh)</option>
                    <option value="normal">Standard Broadcast</option>
                    <option value="relaxed">Relaxed / Low Distraction</option>
                  </select>
                </div>
              </div>

              {/* Scene Rotation Settings */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                    <RefreshCw size={15} color="#10b981" /> Automated Scene Rotation
                  </label>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedDisplay.rotationEnabled)}
                    onChange={(e) => setSelectedDisplay({ ...selectedDisplay, rotationEnabled: e.target.checked })}
                  />
                </div>

                {selectedDisplay.rotationEnabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration Per Scene (Seconds):</label>
                      <select
                        value={selectedDisplay.rotationInterval || 15}
                        onChange={(e) => setSelectedDisplay({ ...selectedDisplay, rotationInterval: parseInt(e.target.value, 10) })}
                        className="input"
                        style={{ width: '100%', marginTop: 4 }}
                      >
                        <option value={10}>10 Seconds (Fast)</option>
                        <option value={15}>15 Seconds (Standard)</option>
                        <option value={20}>20 Seconds (Relaxed)</option>
                        <option value={30}>30 Seconds (Extended)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Theme Palette:</label>
                      <select
                        value={selectedDisplay.theme || 'dark'}
                        onChange={(e) => setSelectedDisplay({ ...selectedDisplay, theme: e.target.value })}
                        className="input"
                        style={{ width: '100%', marginTop: 4 }}
                      >
                        <option value="dark">Dark Stadium OLED</option>
                        <option value="light">High Contrast Day Mode</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Active Scenes Selection */}
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>
                    Active Rotation Scenes (Check all that apply):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {allAvailableScenes.map(sc => {
                      const isChecked = (selectedDisplay.activeScenes || []).includes(sc.id);
                      return (
                        <label
                          key={sc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: isChecked ? '1px solid #10b981' : '1px solid var(--border-color)',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleScene(sc.id)}
                          />
                          <span style={{ color: isChecked ? '#10b981' : 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {sc.icon} {sc.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Advertisements Toggles */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.65rem' }}>
                  Stadium Signage Advertisement Zones
                </label>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDisplay.adTopEnabled)}
                      onChange={(e) => setSelectedDisplay({ ...selectedDisplay, adTopEnabled: e.target.checked })}
                    />
                    Top Banner
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDisplay.adBottomEnabled)}
                      onChange={(e) => setSelectedDisplay({ ...selectedDisplay, adBottomEnabled: e.target.checked })}
                    />
                    Bottom Motion Ticker
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDisplay.adSidebarsEnabled)}
                      onChange={(e) => setSelectedDisplay({ ...selectedDisplay, adSidebarsEnabled: e.target.checked })}
                    />
                    Left &amp; Right Sidebars
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDisplay.adCenterEnabled)}
                      onChange={(e) => setSelectedDisplay({ ...selectedDisplay, adCenterEnabled: e.target.checked })}
                    />
                    Center / Between Matches
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
