'use client';
import React, { useState, useEffect, useMemo } from 'react';
import API from '../../services/api';
import {
  getAllAdsAdminApi,
  createAdAdminApi,
  updateAdAdminApi,
  deleteAdAdminApi,
  controlAdsAdminApi,
  getAdPlaybackStateApi
} from '../../services/advertisementService';
import { socket } from '../../services/socket';
import {
  Play,
  Pause,
  StopCircle,
  Plus,
  Trash2,
  Eye,
  Pencil,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Gauge,
  MapPin,
  CheckCircle,
  AlertCircle,
  X,
  Maximize2,
  Sliders,
  Move,
  Monitor,
  Smartphone,
  Tablet,
  Trophy,
  Search
} from 'lucide-react';

const selectStyle = {
  padding: '7px 2.5rem 7px 10px',
  borderRadius: 8,
  backgroundColor: 'var(--bg-input, #ffffff)',
  color: 'var(--text-main, #0f172a)',
  border: '1px solid var(--border-color, #cbd5e1)',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer'
};

const optionStyle = {
  background: 'var(--bg-card-solid, #ffffff)',
  color: 'var(--text-main, #0f172a)'
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  background: 'var(--bg-input, #ffffff)',
  border: '1px solid var(--border-color, #cbd5e1)',
  color: 'var(--text-main, #0f172a)',
  fontSize: '0.88rem'
};

const PRESET_SIZES = [
  { id: 'RESPONSIVE', label: 'Responsive (Auto Fit Container)', width: '100%', height: 'auto', fit: 'contain' },
  { id: 'STREAM_TOP_STRIP', label: 'Stream Top Strip (Full Width × 48px)', width: '100%', height: '48px', fit: 'contain' },
  { id: 'STREAM_BOTTOM_STRIP', label: 'Stream Bottom Strip (Full Width × 52px)', width: '100%', height: '52px', fit: 'contain' },
  { id: 'STREAM_SIDEBAR_LEFT', label: 'Stream Left Sidebar (140px × 100%)', width: '140px', height: '100%', fit: 'contain' },
  { id: 'STREAM_SIDEBAR_RIGHT', label: 'Stream Right Sidebar (140px × 100%)', width: '140px', height: '100%', fit: 'contain' },
  { id: 'STREAM_BREAK_CARD', label: 'Stream Match Break Card (Full Player 16:9)', width: '100%', height: '100%', fit: 'contain' },
  { id: 'MOBILE_TOP_STRIP', label: 'Mobile Top Strip (720px × 120px / ~64px)', width: '100%', height: '64px', fit: 'contain' },
  { id: 'MOBILE_BOTTOM_STRIP', label: 'Mobile Bottom Strip (720px × 110px / ~56px)', width: '100%', height: '56px', fit: 'contain' },
  { id: 'COURT_MIDDLE_STRIP', label: 'Court Middle Strip (Vertical Beside Net ~80×240px)', width: '80px', height: '240px', fit: 'cover' },
  { id: 'SIGNAGE_TOP_BANNER', label: 'Signage Top Banner (Full Width × 76px)', width: '100%', height: '76px', fit: 'contain' },
  { id: 'SIGNAGE_BOTTOM_TICKER', label: 'Signage Bottom Ticker (Full Width × 48px)', width: '100%', height: '48px', fit: 'contain' },
  { id: 'SIGNAGE_SIDEBAR_TALL', label: 'Signage Tall Sidebar (240px × 680px)', width: '240px', height: '680px', fit: 'contain' },
  { id: 'LEADERBOARD', label: 'Leaderboard (728px × 90px)', width: '728px', height: '90px', fit: 'contain' },
  { id: 'LARGE_LEADERBOARD', label: 'Large Leaderboard (970px × 90px)', width: '970px', height: '90px', fit: 'contain' },
  { id: 'BILLBOARD', label: 'Billboard (970px × 250px)', width: '970px', height: '250px', fit: 'cover' },
  { id: 'BANNER', label: 'Standard Banner (468px × 60px)', width: '468px', height: '60px', fit: 'contain' },
  { id: 'MEDIUM_RECTANGLE', label: 'Medium Rectangle (300px × 250px)', width: '300px', height: '250px', fit: 'cover' },
  { id: 'SKYSCRAPER', label: 'Skyscraper (160px × 600px)', width: '160px', height: '600px', fit: 'contain' },
  { id: 'WIDE_SKYSCRAPER', label: 'Wide Skyscraper (260px × 600px)', width: '260px', height: '600px', fit: 'contain' },
  { id: 'FULL_WIDTH', label: 'Full Width Stretch (100% × Auto)', width: '100%', height: 'auto', fit: 'cover' },
  { id: 'CUSTOM', label: 'Custom Width & Height', width: '300px', height: '200px', fit: 'contain' }
];

const AdManagementPanel = () => {
  const [ads, setAds] = useState([]);
  const [venues, setVenues] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [venueFilter, setVenueFilter] = useState('ALL');
  const [tournamentFilter, setTournamentFilter] = useState('ALL');
  const [tournamentSearchQuery, setTournamentSearchQuery] = useState('');
  const [playbackState, setPlaybackState] = useState({
    adsEnabled: true,
    topAdMode: 'STATIC',
    bottomAdMode: 'MOTION',
    bottomAdPaused: false,
    sidebarAdsEnabled: true,
    leftSidebarPaused: false,
    rightSidebarPaused: false,
    zoneSettings: { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 },
    venueZoneSettings: {},
    portraitZoneSettings: { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' },
    venuePortraitZoneSettings: {},
    mobileZoneSettings: { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 },
    venueMobileZoneSettings: {},
    streamZoneSettings: {
      topHeight: 48,
      bottomHeight: 52,
      leftWidth: 140,
      rightWidth: 140,
      topSpeed: 45,
      bottomSpeed: 45,
      rotateInterval: 6,
      breakInterval: 5,
      hideSidebarsOnMobile: true
    },
    venueStreamZoneSettings: {}
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [previewModal, setPreviewModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewDevice, setPreviewDevice] = useState('signage'); // 'signage', 'desktop', 'tablet', 'mobile'

  // Comprehensive Form State with Sizing, Placement & Movement Controls
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    linkUrl: '',
    position: 'TOP',
    sizePreset: 'RESPONSIVE',
    width: '100%',
    height: 'auto',
    widthUnit: '%',
    widthValue: 100,
    heightUnit: 'px',
    heightValue: 76,
    imageFit: 'contain',
    motionType: 'STATIC',
    movementDirection: 'RIGHT_TO_LEFT',
    speed: 25,
    slideInterval: 6,
    pauseOnHover: true,
    venueIds: [],
    tournamentIds: [],
    sortOrder: 0,
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    targetPage: 'ALL',
    deviceTarget: 'ALL',
    devices: ['MOBILE', 'TV', 'SIGNAGE'],
    imageFile: null
  });
  const [formImagePreview, setFormImagePreview] = useState('');
  const [zoneOrientationTab, setZoneOrientationTab] = useState('LANDSCAPE'); // 'LANDSCAPE' | 'PORTRAIT'

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  useEffect(() => {
    fetchAdsAndState();
    fetchVenuesList();
    fetchTournamentsList();

    const handleAdEvent = (data) => {
      if (data?.playbackState) {
        setPlaybackState(data.playbackState);
      }
      fetchAdsAndState();
    };

    socket.on('signage:playbackUpdated', handleAdEvent);
    socket.on('signage:adUpdated', handleAdEvent);
    socket.on('signage:adAdded', handleAdEvent);
    socket.on('signage:adRemoved', handleAdEvent);
    socket.on('signage:adPaused', (d) => setPlaybackState(prev => ({ ...prev, bottomAdPaused: true, ...d.playbackState })));
    socket.on('signage:adResumed', (d) => setPlaybackState(prev => ({ ...prev, bottomAdPaused: false, ...d.playbackState })));
    socket.on('signage:adsDisabled', (d) => setPlaybackState(prev => ({ ...prev, adsEnabled: false, ...d.playbackState })));
    socket.on('signage:adsEnabled', (d) => setPlaybackState(prev => ({ ...prev, adsEnabled: true, ...d.playbackState })));

    return () => {
      socket.off('signage:playbackUpdated', handleAdEvent);
      socket.off('signage:adUpdated', handleAdEvent);
      socket.off('signage:adAdded', handleAdEvent);
      socket.off('signage:adRemoved', handleAdEvent);
      socket.off('signage:adPaused');
      socket.off('signage:adResumed');
      socket.off('signage:adsDisabled');
      socket.off('signage:adsEnabled');
    };
  }, []);

  const fetchVenuesList = async () => {
    try {
      const res = await API.get('/venues');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setVenues(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load venues list:', err.message);
    }
  };

  const fetchTournamentsList = async () => {
    try {
      const res = await API.get('/tournaments');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setTournaments(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load tournaments list:', err.message);
    }
  };

  const fetchAdsAndState = async () => {
    try {
      setLoading(true);
      const [adsRes, stateRes] = await Promise.all([
        getAllAdsAdminApi(),
        getAdPlaybackStateApi()
      ]);
      if (adsRes.success) setAds(adsRes.data);
      if (stateRes.success) setPlaybackState(stateRes.data);
    } catch (err) {
      console.error('Failed to load advertisements:', err);
    } finally {
      setLoading(false);
    }
  };

  const venueMap = useMemo(() => {
    const map = {};
    venues.forEach(v => {
      map[v.id] = v.name;
    });
    return map;
  }, [venues]);

  const tournamentMap = useMemo(() => {
    const map = {};
    tournaments.forEach(t => {
      map[t.id] = t.name;
    });
    return map;
  }, [tournaments]);

  // Active Zone Sizes (resolved per venue with global fallback)
  const currentZoneSizes = useMemo(() => {
    const defaults = { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 };
    const globalZones = { ...defaults, ...(playbackState?.zoneSettings || {}) };
    if (venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL') {
      const vSettings = playbackState?.venueZoneSettings?.[String(venueFilter)];
      return { ...globalZones, ...(vSettings || {}) };
    }
    return globalZones;
  }, [playbackState, venueFilter]);

  // Active Portrait Zone Sizes (resolved per venue with global fallback)
  const currentPortraitZoneSizes = useMemo(() => {
    const defaults = { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' };
    const globalZones = { ...defaults, ...(playbackState?.portraitZoneSettings || {}) };
    if (venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL') {
      const vSettings = playbackState?.venuePortraitZoneSettings?.[String(venueFilter)];
      return { ...globalZones, ...(vSettings || {}) };
    }
    return globalZones;
  }, [playbackState, venueFilter]);

  const handlePortraitZoneSizeChange = async (zoneKey, value) => {
    const numVal = zoneKey === 'sidebarsMode' ? value : parseInt(value, 10);
    if (zoneKey !== 'sidebarsMode' && isNaN(numVal)) return;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        return {
          ...prev,
          venuePortraitZoneSettings: {
            ...prev.venuePortraitZoneSettings,
            [vKey]: {
              ...(prev.venuePortraitZoneSettings?.[vKey] || prev.portraitZoneSettings || { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' }),
              [zoneKey]: numVal
            }
          }
        };
      }
      return {
        ...prev,
        portraitZoneSettings: {
          ...(prev.portraitZoneSettings || { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' }),
          [zoneKey]: numVal
        }
      };
    });

    try {
      await controlAdsAdminApi('UPDATE_ZONE_SIZES', {
        venueId: venueFilter,
        isPortrait: true,
        sizes: { [zoneKey]: numVal }
      });
    } catch (err) {
      console.warn('Portrait zone size update error:', err);
    }
  };

  const handleResetPortraitZone = async (zoneKey) => {
    const defaults = { topHeight: 160, bottomHeight: 80, sidebarStripHeight: 90, sidebarsMode: 'STRIP' };
    const defaultVal = defaults[zoneKey] || 160;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        const copy = { ...(prev.venuePortraitZoneSettings?.[vKey] || {}) };
        delete copy[zoneKey];
        return {
          ...prev,
          venuePortraitZoneSettings: {
            ...prev.venuePortraitZoneSettings,
            [vKey]: copy
          }
        };
      }
      return {
        ...prev,
        portraitZoneSettings: {
          ...(prev.portraitZoneSettings || {}),
          [zoneKey]: defaultVal
        }
      };
    });

    try {
      await controlAdsAdminApi('RESET_ZONE_SIZE', {
        venueId: venueFilter,
        zone: zoneKey,
        isPortrait: true
      });
      showToast(`Reset portrait ${zoneKey} to default`);
    } catch (err) {
      console.warn('Portrait zone reset error:', err);
    }
  };

  // Active Mobile Zone Sizes (resolved per venue with global fallback)
  const currentMobileZoneSizes = useMemo(() => {
    const defaults = { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 };
    const globalZones = { ...defaults, ...(playbackState?.mobileZoneSettings || {}) };
    if (venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL') {
      const vSettings = playbackState?.venueMobileZoneSettings?.[String(venueFilter)];
      return { ...globalZones, ...(vSettings || {}) };
    }
    return globalZones;
  }, [playbackState, venueFilter]);

  const handleMobileZoneSizeChange = async (zoneKey, value) => {
    const numVal = parseInt(value, 10);
    if (isNaN(numVal)) return;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      const defaults = { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 };
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        return {
          ...prev,
          venueMobileZoneSettings: {
            ...prev.venueMobileZoneSettings,
            [vKey]: {
              ...(prev.venueMobileZoneSettings?.[vKey] || prev.mobileZoneSettings || defaults),
              [zoneKey]: numVal
            }
          }
        };
      }
      return {
        ...prev,
        mobileZoneSettings: {
          ...(prev.mobileZoneSettings || defaults),
          [zoneKey]: numVal
        }
      };
    });

    try {
      await controlAdsAdminApi('UPDATE_ZONE_SIZES', {
        venueId: venueFilter,
        isMobile: true,
        orientation: 'MOBILE',
        sizes: { [zoneKey]: numVal }
      });
    } catch (err) {
      console.warn('Mobile zone size update error:', err);
    }
  };

  const handleResetMobileZone = async (zoneKey) => {
    const defaults = { topHeight: 64, bottomHeight: 56, topSpeed: 50, bottomSpeed: 40 };
    const defaultVal = defaults[zoneKey] || 64;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        if (zoneKey === 'ALL') {
          const nextVenueSettings = { ...(prev.venueMobileZoneSettings || {}) };
          delete nextVenueSettings[vKey];
          return { ...prev, venueMobileZoneSettings: nextVenueSettings };
        }
        return {
          ...prev,
          venueMobileZoneSettings: {
            ...prev.venueMobileZoneSettings,
            [vKey]: {
              ...(prev.venueMobileZoneSettings?.[vKey] || prev.mobileZoneSettings || defaults),
              [zoneKey]: defaultVal
            }
          }
        };
      }
      if (zoneKey === 'ALL') {
        return { ...prev, mobileZoneSettings: { ...defaults } };
      }
      return {
        ...prev,
        mobileZoneSettings: {
          ...(prev.mobileZoneSettings || defaults),
          [zoneKey]: defaultVal
        }
      };
    });

    try {
      await controlAdsAdminApi('RESET_ZONE_SIZE', {
        venueId: venueFilter,
        isMobile: true,
        orientation: 'MOBILE',
        zone: zoneKey
      });
      showToast(`Reset mobile ${zoneKey} to default`);
    } catch (err) {
      console.warn('Mobile zone reset error:', err);
    }
  };

  // Active Stream Zone Sizes (resolved per venue with global fallback)
  const currentStreamZoneSizes = useMemo(() => {
    const defaults = {
      topHeight: 48,
      bottomHeight: 52,
      leftWidth: 140,
      rightWidth: 140,
      topSpeed: 45,
      bottomSpeed: 45,
      rotateInterval: 6,
      breakInterval: 5,
      hideSidebarsOnMobile: true
    };
    const globalZones = { ...defaults, ...(playbackState?.streamZoneSettings || {}) };
    if (venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL') {
      const vSettings = playbackState?.venueStreamZoneSettings?.[String(venueFilter)];
      return { ...globalZones, ...(vSettings || {}) };
    }
    return globalZones;
  }, [playbackState, venueFilter]);

  const handleStreamZoneSizeChange = async (zoneKey, value) => {
    const isBool = typeof value === 'boolean';
    const numVal = isBool ? value : parseInt(value, 10);
    if (!isBool && isNaN(numVal)) return;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      const defaults = {
        topHeight: 48,
        bottomHeight: 52,
        leftWidth: 140,
        rightWidth: 140,
        topSpeed: 45,
        bottomSpeed: 45,
        rotateInterval: 6,
        breakInterval: 5,
        hideSidebarsOnMobile: true
      };
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        return {
          ...prev,
          venueStreamZoneSettings: {
            ...prev.venueStreamZoneSettings,
            [vKey]: {
              ...(prev.venueStreamZoneSettings?.[vKey] || prev.streamZoneSettings || defaults),
              [zoneKey]: numVal
            }
          }
        };
      }
      return {
        ...prev,
        streamZoneSettings: {
          ...(prev.streamZoneSettings || defaults),
          [zoneKey]: numVal
        }
      };
    });

    try {
      await controlAdsAdminApi('UPDATE_ZONE_SIZES', {
        venueId: venueFilter,
        isStream: true,
        orientation: 'STREAM',
        sizes: { [zoneKey]: numVal }
      });
    } catch (err) {
      console.warn('Stream zone size update error:', err);
    }
  };

  const handleResetStreamZone = async (zoneKey) => {
    const defaults = {
      topHeight: 48,
      bottomHeight: 52,
      leftWidth: 140,
      rightWidth: 140,
      topSpeed: 45,
      bottomSpeed: 45,
      rotateInterval: 6,
      breakInterval: 5,
      hideSidebarsOnMobile: true
    };
    const defaultVal = defaults[zoneKey] !== undefined ? defaults[zoneKey] : 48;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        if (zoneKey === 'ALL') {
          const nextVenueSettings = { ...(prev.venueStreamZoneSettings || {}) };
          delete nextVenueSettings[vKey];
          return { ...prev, venueStreamZoneSettings: nextVenueSettings };
        }
        return {
          ...prev,
          venueStreamZoneSettings: {
            ...prev.venueStreamZoneSettings,
            [vKey]: {
              ...(prev.venueStreamZoneSettings?.[vKey] || prev.streamZoneSettings || defaults),
              [zoneKey]: defaultVal
            }
          }
        };
      }
      if (zoneKey === 'ALL') {
        return { ...prev, streamZoneSettings: { ...defaults } };
      }
      return {
        ...prev,
        streamZoneSettings: {
          ...(prev.streamZoneSettings || defaults),
          [zoneKey]: defaultVal
        }
      };
    });

    try {
      await controlAdsAdminApi('RESET_ZONE_SIZE', {
        venueId: venueFilter,
        isStream: true,
        orientation: 'STREAM',
        zone: zoneKey
      });
      showToast(`Reset stream ${zoneKey} to default`);
    } catch (err) {
      console.warn('Stream zone reset error:', err);
    }
  };

  const handleZoneSizeChange = async (zoneKey, value) => {
    const numVal = parseInt(value, 10);
    if (isNaN(numVal)) return;

    // Optimistically update local state for smooth slider response
    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        return {
          ...prev,
          venueZoneSettings: {
            ...prev.venueZoneSettings,
            [vKey]: {
              ...(prev.venueZoneSettings?.[vKey] || prev.zoneSettings || { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 }),
              [zoneKey]: numVal
            }
          }
        };
      }
      return {
        ...prev,
        zoneSettings: {
          ...(prev.zoneSettings || { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 }),
          [zoneKey]: numVal
        }
      };
    });

    try {
      await controlAdsAdminApi('UPDATE_ZONE_SIZES', {
        venueId: venueFilter,
        sizes: { [zoneKey]: numVal }
      });
    } catch (err) {
      console.warn('Zone size update error:', err);
    }
  };

  const handleResetZone = async (zoneKey) => {
    const defaultVal = { topHeight: 120, leftWidth: 220, rightWidth: 220, bottomHeight: 70 }[zoneKey] || 120;

    setPlaybackState(prev => {
      const isVenueSpecific = venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL';
      if (isVenueSpecific) {
        const vKey = String(venueFilter);
        const copy = { ...(prev.venueZoneSettings?.[vKey] || {}) };
        delete copy[zoneKey];
        return {
          ...prev,
          venueZoneSettings: {
            ...prev.venueZoneSettings,
            [vKey]: copy
          }
        };
      }
      return {
        ...prev,
        zoneSettings: {
          ...(prev.zoneSettings || {}),
          [zoneKey]: defaultVal
        }
      };
    });

    try {
      await controlAdsAdminApi('RESET_ZONE_SIZE', {
        venueId: venueFilter,
        zone: zoneKey
      });
      showToast(`Reset ${zoneKey} to default (${defaultVal}px)`);
    } catch (err) {
      console.warn('Zone reset error:', err);
    }
  };

  const handleControlAction = async (action, payload = {}) => {
    try {
      setActionLoading(true);
      const res = await controlAdsAdminApi(action, payload);
      if (res.success) {
        setPlaybackState(res.data);
        showToast(`Control command executed: ${action}`);
      }
    } catch (err) {
      alert(`Action '${action}' failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (ad) => {
    const nextStatus = ad.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateAdAdminApi(ad.id, { status: nextStatus });
      fetchAdsAndState();
      showToast(`Ad status set to ${nextStatus}`);
    } catch {
      alert('Failed to update ad status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      await deleteAdAdminApi(id);
      fetchAdsAndState();
      showToast('Advertisement deleted successfully');
    } catch {
      alert('Failed to delete ad');
    }
  };

  // Helper to parse dimension string (e.g. '728px', '100%') into value & unit
  const parseDimension = (str, defaultVal = 100, defaultUnit = '%') => {
    if (!str || str === 'auto') return { val: defaultVal, unit: defaultUnit };
    const match = String(str).match(/^(\d+(?:\.\d+)?)(px|%|vh|vw|em|rem)?$/);
    if (match) {
      return { val: parseFloat(match[1]), unit: match[2] || 'px' };
    }
    return { val: defaultVal, unit: defaultUnit };
  };

  const openCreateModal = (initialPosition = 'TOP') => {
    setEditingAd(null);
    setModalError('');
    setTournamentSearchQuery('');

    const isCourtMiddle = initialPosition === 'COURT_MIDDLE';
    const isMobileTop = initialPosition === 'MOBILE_TOP';
    const isMobileBottom = initialPosition === 'MOBILE_BOTTOM';
    const isStreamTop = initialPosition === 'STREAM_TOP';
    const isStreamBottom = initialPosition === 'STREAM_BOTTOM';
    const isStreamLeft = initialPosition === 'STREAM_LEFT';
    const isStreamRight = initialPosition === 'STREAM_RIGHT';
    const isStreamBreak = initialPosition === 'STREAM_BREAK';

    let defaultPreset = 'RESPONSIVE';
    let defaultWidth = '100%';
    let defaultHeight = 'auto';
    let defaultWidthVal = 100;
    let defaultWidthUnit = '%';
    let defaultHeightVal = 76;
    let defaultHeightUnit = 'px';
    let defaultFit = 'contain';
    let defaultMotion = 'STATIC';
    let defaultDir = 'RIGHT_TO_LEFT';
    let defaultSpeed = 25;
    let defaultDevices = ['MOBILE', 'TV', 'SIGNAGE'];

    if (isCourtMiddle) {
      defaultPreset = 'COURT_MIDDLE_STRIP';
      defaultWidth = '80px';
      defaultHeight = '240px';
      defaultWidthVal = 80;
      defaultWidthUnit = 'px';
      defaultHeightVal = 240;
      defaultFit = 'cover';
    } else if (isMobileTop) {
      defaultPreset = 'MOBILE_TOP_STRIP';
      defaultHeight = '64px';
      defaultHeightVal = 64;
      defaultMotion = 'SCROLL';
      defaultSpeed = 50;
      defaultDevices = ['MOBILE'];
    } else if (isMobileBottom) {
      defaultPreset = 'MOBILE_BOTTOM_STRIP';
      defaultHeight = '56px';
      defaultHeightVal = 56;
      defaultMotion = 'SCROLL';
      defaultDir = 'LEFT_TO_RIGHT';
      defaultSpeed = 40;
      defaultDevices = ['MOBILE'];
    } else if (isStreamTop) {
      defaultPreset = 'STREAM_TOP_STRIP';
      defaultHeight = '48px';
      defaultHeightVal = 48;
      defaultMotion = 'SCROLL';
      defaultSpeed = 45;
    } else if (isStreamBottom) {
      defaultPreset = 'STREAM_BOTTOM_STRIP';
      defaultHeight = '52px';
      defaultHeightVal = 52;
      defaultMotion = 'SCROLL';
      defaultDir = 'LEFT_TO_RIGHT';
      defaultSpeed = 45;
    } else if (isStreamLeft) {
      defaultPreset = 'STREAM_SIDEBAR_LEFT';
      defaultWidth = '140px';
      defaultWidthVal = 140;
      defaultWidthUnit = 'px';
      defaultHeight = '100%';
      defaultHeightVal = 100;
      defaultHeightUnit = '%';
    } else if (isStreamRight) {
      defaultPreset = 'STREAM_SIDEBAR_RIGHT';
      defaultWidth = '140px';
      defaultWidthVal = 140;
      defaultWidthUnit = 'px';
      defaultHeight = '100%';
      defaultHeightVal = 100;
      defaultHeightUnit = '%';
    } else if (isStreamBreak) {
      defaultPreset = 'STREAM_BREAK_CARD';
      defaultWidth = '100%';
      defaultHeight = '100%';
      defaultHeightVal = 100;
      defaultHeightUnit = '%';
      defaultFit = 'contain';
    }

    setFormData({
      title: '',
      description: '',
      linkUrl: '',
      position: initialPosition,
      sizePreset: defaultPreset,
      width: defaultWidth,
      height: defaultHeight,
      widthUnit: defaultWidthUnit,
      widthValue: defaultWidthVal,
      heightUnit: defaultHeightUnit,
      heightValue: defaultHeightVal,
      imageFit: defaultFit,
      motionType: defaultMotion,
      movementDirection: defaultDir,
      speed: defaultSpeed,
      slideInterval: 6,
      pauseOnHover: true,
      venueIds: [],
      tournamentIds: [],
      sortOrder: 0,
      startDate: '',
      endDate: '',
      status: 'ACTIVE',
      targetPage: 'ALL',
      deviceTarget: 'ALL',
      devices: defaultDevices,
      imageFile: null
    });
    setFormImagePreview('');
    setModalOpen(true);
  };

  const openEditModal = (ad) => {
    setEditingAd(ad);
    setModalError('');
    setTournamentSearchQuery('');
    const parsedWidth = parseDimension(ad.width, 100, '%');
    const parsedHeight = parseDimension(ad.height, 76, 'px');

    setFormData({
      title: ad.title || '',
      description: ad.description || '',
      linkUrl: ad.linkUrl || ad.clickUrl || '',
      position: ad.position || 'TOP',
      sizePreset: ad.sizePreset || 'RESPONSIVE',
      width: ad.width || '100%',
      height: ad.height || 'auto',
      widthUnit: parsedWidth.unit,
      widthValue: parsedWidth.val,
      heightUnit: parsedHeight.unit,
      heightValue: parsedHeight.val,
      imageFit: ad.imageFit || 'contain',
      motionType: ad.motionType || (ad.displayMode === 'MOTION' ? 'SCROLL' : 'STATIC'),
      movementDirection: ad.movementDirection || (ad.position === 'LEFT' || ad.position === 'RIGHT' ? 'BOTTOM_TO_TOP' : 'RIGHT_TO_LEFT'),
      speed: ad.speed || 25,
      slideInterval: ad.slideInterval || 6,
      pauseOnHover: ad.pauseOnHover !== false,
      venueIds: Array.isArray(ad.venueIds) ? ad.venueIds : [],
      tournamentIds: Array.isArray(ad.tournamentIds) ? ad.tournamentIds : (ad.tournamentId ? [ad.tournamentId] : []),
      sortOrder: ad.sortOrder ?? 0,
      startDate: ad.startDate ? String(ad.startDate).split('T')[0] : '',
      endDate: ad.endDate ? String(ad.endDate).split('T')[0] : '',
      status: ad.status || 'ACTIVE',
      targetPage: ad.targetPage || 'ALL',
      deviceTarget: ad.deviceTarget || 'ALL',
      devices: Array.isArray(ad.devices) && ad.devices.length > 0 ? ad.devices : ['MOBILE', 'TV', 'SIGNAGE'],
      imageFile: null
    });
    setFormImagePreview(ad.imageUrl || '');
    setModalOpen(true);
  };

  const handlePresetSelect = (presetId) => {
    const preset = PRESET_SIZES.find(p => p.id === presetId);
    if (!preset) return;

    if (preset.id === 'CUSTOM') {
      setFormData(prev => ({
        ...prev,
        sizePreset: 'CUSTOM'
      }));
      return;
    }

    const parsedWidth = parseDimension(preset.width, 100, '%');
    const parsedHeight = parseDimension(preset.height, 76, 'px');

    setFormData(prev => {
      let nextPos = prev.position;
      let nextMotion = prev.motionType;

      if (preset.id === 'SIGNAGE_SIDEBAR_TALL' || preset.id === 'SKYSCRAPER' || preset.id === 'WIDE_SKYSCRAPER') {
        if (prev.position !== 'LEFT' && prev.position !== 'RIGHT' && prev.position !== 'BOTH_SIDEBARS') {
          nextPos = 'LEFT';
        }
      } else if (preset.id === 'SIGNAGE_BOTTOM_TICKER') {
        nextPos = 'BOTTOM';
        nextMotion = 'SCROLL';
      } else if (preset.id === 'MOBILE_TOP_STRIP') {
        nextPos = 'MOBILE_TOP';
        nextMotion = 'SCROLL';
      } else if (preset.id === 'MOBILE_BOTTOM_STRIP') {
        nextPos = 'MOBILE_BOTTOM';
        nextMotion = 'SCROLL';
      } else if (preset.id === 'STREAM_TOP_STRIP') {
        nextPos = 'STREAM_TOP';
        nextMotion = 'SCROLL';
      } else if (preset.id === 'STREAM_BOTTOM_STRIP') {
        nextPos = 'STREAM_BOTTOM';
        nextMotion = 'SCROLL';
      } else if (preset.id === 'STREAM_SIDEBAR_LEFT') {
        nextPos = 'STREAM_LEFT';
        nextMotion = 'STATIC';
      } else if (preset.id === 'STREAM_SIDEBAR_RIGHT') {
        nextPos = 'STREAM_RIGHT';
        nextMotion = 'STATIC';
      } else if (preset.id === 'STREAM_BREAK_CARD') {
        nextPos = 'STREAM_BREAK';
        nextMotion = 'STATIC';
      } else if (preset.id === 'COURT_MIDDLE_STRIP') {
        nextPos = 'COURT_MIDDLE';
        nextMotion = 'STATIC';
      } else if (preset.id === 'SIGNAGE_TOP_BANNER' || preset.id === 'LEADERBOARD' || preset.id === 'LARGE_LEADERBOARD') {
        nextPos = 'TOP';
      }

      return {
        ...prev,
        sizePreset: preset.id,
        width: preset.width,
        height: preset.height,
        widthValue: parsedWidth.val,
        widthUnit: parsedWidth.unit,
        heightValue: parsedHeight.val,
        heightUnit: parsedHeight.unit,
        imageFit: preset.fit || prev.imageFit,
        position: nextPos,
        motionType: nextMotion
      };
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const handleVenueToggle = (venueId) => {
    setFormData(prev => {
      const exists = prev.venueIds.includes(venueId);
      if (exists) {
        return { ...prev, venueIds: prev.venueIds.filter(id => id !== venueId) };
      } else {
        return { ...prev, venueIds: [...prev.venueIds, venueId] };
      }
    });
  };

  const handleTournamentToggle = (tournId) => {
    setFormData(prev => {
      const exists = prev.tournamentIds?.includes(tournId);
      if (exists) {
        return { ...prev, tournamentIds: prev.tournamentIds.filter(id => id !== tournId) };
      } else {
        return { ...prev, tournamentIds: [...(prev.tournamentIds || []), tournId] };
      }
    });
  };

  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!editingAd && !formData.imageFile) {
      setModalError('Please select an advertisement image file.');
      return;
    }

    try {
      setActionLoading(true);
      const payload = new FormData();
      payload.append('title', formData.title || 'Stadium Ad');
      payload.append('description', formData.description || '');
      payload.append('linkUrl', formData.linkUrl || '');
      payload.append('position', formData.position);
      payload.append('sizePreset', formData.sizePreset);

      // Compute width and height string
      const computedWidth = formData.sizePreset === 'CUSTOM'
        ? `${formData.widthValue}${formData.widthUnit}`
        : (formData.width || '100%');
      const computedHeight = formData.sizePreset === 'CUSTOM'
        ? `${formData.heightValue}${formData.heightUnit}`
        : (formData.height || 'auto');

      payload.append('width', computedWidth);
      payload.append('height', computedHeight);
      payload.append('imageFit', formData.imageFit);
      payload.append('motionType', formData.motionType);
      payload.append('movementDirection', formData.movementDirection);
      payload.append('displayMode', formData.motionType === 'STATIC' ? 'STATIC' : 'MOTION');
      payload.append('speed', formData.speed || 25);
      payload.append('slideInterval', formData.slideInterval || 6);
      payload.append('pauseOnHover', formData.pauseOnHover ? 'true' : 'false');
      payload.append('sortOrder', formData.sortOrder);
      payload.append('status', formData.status);
      payload.append('targetPage', formData.targetPage);
      payload.append('deviceTarget', formData.deviceTarget);
      payload.append('devices', JSON.stringify(formData.devices || ['MOBILE', 'TV', 'SIGNAGE']));
      payload.append('venueIds', JSON.stringify(formData.venueIds || []));
      payload.append('tournamentIds', JSON.stringify(formData.tournamentIds || []));
      if (formData.startDate) payload.append('startDate', formData.startDate);
      if (formData.endDate) payload.append('endDate', formData.endDate);

      if (formData.imageFile) {
        payload.append('image', formData.imageFile);
      }

      if (editingAd) {
        const res = await updateAdAdminApi(editingAd.id, payload);
        if (res.success) {
          setModalOpen(false);
          setEditingAd(null);
          fetchAdsAndState();
          showToast('Advertisement updated successfully!');
        } else {
          setModalError(res.message || 'Failed to update advertisement');
        }
      } else {
        const res = await createAdAdminApi(payload);
        if (res.success) {
          setModalOpen(false);
          fetchAdsAndState();
          showToast('Advertisement uploaded and published!');
        } else {
          setModalError(res.message || 'Failed to create advertisement');
        }
      }
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Error saving advertisement');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter ads by selected venue and tournament
  const filterAds = (list) => {
    let res = list;
    if (venueFilter === 'GLOBAL') {
      res = res.filter(a => !a.venueIds || a.venueIds.length === 0);
    } else if (venueFilter !== 'ALL') {
      const targetId = Number(venueFilter);
      res = res.filter(a => !a.venueIds || a.venueIds.length === 0 || a.venueIds.includes(targetId));
    }

    if (tournamentFilter === 'GLOBAL') {
      res = res.filter(a => !a.tournamentIds || a.tournamentIds.length === 0);
    } else if (tournamentFilter !== 'ALL') {
      const targetTournId = Number(tournamentFilter);
      res = res.filter(a => !a.tournamentIds || a.tournamentIds.length === 0 || a.tournamentIds.includes(targetTournId));
    }
    return res;
  };

  const topAds = filterAds(ads.filter(a => a.position === 'TOP'));
  const sidebarAds = filterAds(ads.filter(a => a.position === 'LEFT' || a.position === 'RIGHT' || a.position === 'BOTH_SIDEBARS'));
  const bottomAds = filterAds(ads.filter(a => a.position === 'BOTTOM'));
  const courtAds = filterAds(ads.filter(a => a.position === 'COURT'));
  const courtMiddleAds = filterAds(ads.filter(a => a.position === 'COURT_MIDDLE' || a.position === 'court_middle'));
  const mobileTopAds = filterAds(ads.filter(a => a.position === 'MOBILE_TOP' || a.position === 'mobile_top'));
  const mobileBottomAds = filterAds(ads.filter(a => a.position === 'MOBILE_BOTTOM' || a.position === 'mobile_bottom'));
  const streamTopAds = filterAds(ads.filter(a => a.position === 'STREAM_TOP' || a.position === 'stream_top'));
  const streamBottomAds = filterAds(ads.filter(a => a.position === 'STREAM_BOTTOM' || a.position === 'stream_bottom'));
  const streamLeftAds = filterAds(ads.filter(a => a.position === 'STREAM_LEFT' || a.position === 'stream_left'));
  const streamRightAds = filterAds(ads.filter(a => a.position === 'STREAM_RIGHT' || a.position === 'stream_right'));
  const streamBreakAds = filterAds(ads.filter(a => a.position === 'STREAM_BREAK' || a.position === 'stream_break'));

  const renderStreamTable = (tableTitle, adsList, positionKey, accentColor) => (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
          <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
            {tableTitle}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal(positionKey)}
          className="btn btn-sm"
          style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={12} /> Add {positionKey.replace('STREAM_', '')} Ad
        </button>
      </div>

      {adsList.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 10, fontSize: '0.84rem' }}>
          No {tableTitle} configured yet. Click &quot;Add {positionKey.replace('STREAM_', '')} Ad&quot; to create one.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Title</th>
                <th>Preset / Sizing</th>
                <th>Fit</th>
                <th>Motion</th>
                <th>Tournament</th>
                <th>Venue</th>
                <th>Device</th>
                <th>Order</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adsList.map(ad => (
                <tr key={ad.id}>
                  <td>
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      onClick={() => setPreviewModal(ad)}
                      style={{ width: 70, height: 32, objectFit: ad.imageFit || 'contain', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.4)' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{ad.title}</div>
                    {ad.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.description}</div>}
                    {ad.linkUrl && <div style={{ fontSize: '0.68rem', color: '#60a5fa', textDecoration: 'underline' }}>{ad.linkUrl}</div>}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {ad.sizePreset || 'CUSTOM'}
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{ad.width || '100%'} × {ad.height || 'auto'}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                      {ad.imageFit || 'contain'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: accentColor }}>
                      {ad.motionType || 'STATIC'} {ad.motionType === 'SCROLL' ? (ad.movementDirection === 'LEFT_TO_RIGHT' ? '(LTR)' : '(RTL)') : ''}
                    </span>
                  </td>
                  <td>
                    {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                        All Tournaments
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                      </span>
                    )}
                  </td>
                  <td>
                    {!ad.venueIds || ad.venueIds.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                        All Venues
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600 }}>
                      {ad.devices && ad.devices.length ? ad.devices.join(', ') : 'All Devices'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
                    {ad.sortOrder ?? 0}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                  </td>
                  <td>
                    <span
                      onClick={() => handleToggleStatus(ad)}
                      style={{
                        cursor: 'pointer',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                      }}
                    >
                      {ad.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: 'var(--accent-primary, #10b981)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.25s ease-in'
          }}
        >
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* ── REAL-TIME SUPER ADMIN CONTROL CONSOLE ── */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(15,23,42,0.6) 100%)',
          borderRadius: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>Signage Display Real-Time Control Center</h2>
            </div>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Configure adjustable ad sizes, left &amp; right sidebars, and static/moving ads with instant WebSocket synchronization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Venue Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="var(--accent-primary, #10b981)" />
              <select
                id="venue-filter-select"
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                style={selectStyle}
                title="Filter ads by venue"
              >
                <option value="ALL" style={optionStyle}>All Venues &amp; Global</option>
                <option value="GLOBAL" style={optionStyle}>Global Ads Only</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id} style={optionStyle}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Tournament Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={16} color="#60a5fa" />
              <select
                id="tournament-filter-select"
                value={tournamentFilter}
                onChange={(e) => setTournamentFilter(e.target.value)}
                style={selectStyle}
                title="Filter ads by tournament"
              >
                <option value="ALL" style={optionStyle}>All Tournaments &amp; Global</option>
                <option value="GLOBAL" style={optionStyle}>Global Ads Only</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id} style={optionStyle}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={openCreateModal}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Plus size={18} /> Configure &amp; Upload Ad
            </button>
          </div>
        </div>

        {/* Global Controls Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Master Ad Power Toggle */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>GLOBAL PLAYBACK</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: playbackState.adsEnabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: playbackState.adsEnabled ? '#10b981' : '#ef4444',
                  border: `1px solid ${playbackState.adsEnabled ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`
                }}
              >
                {playbackState.adsEnabled ? 'ADS: ACTIVE (ON)' : 'ADS: STOPPED (OFF)'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {playbackState.adsEnabled ? (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('STOP_ADS')}
                  className="btn btn-sm"
                  style={{ width: '100%', background: '#ef4444', color: '#fff', fontWeight: 700, justifyContent: 'center' }}
                >
                  <StopCircle size={15} /> Stop All Ads
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('START_ADS')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', fontWeight: 700, justifyContent: 'center' }}
                >
                  <Play size={15} /> Resume All Ads
                </button>
              )}
            </div>
          </div>

          {/* Bottom Ticker Motion Control */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>BOTTOM TICKER MOTION</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: playbackState.bottomAdPaused ? 'rgba(234,179,8,0.2)' : 'rgba(16,185,129,0.2)',
                  color: playbackState.bottomAdPaused ? '#eab308' : '#10b981',
                  border: `1px solid ${playbackState.bottomAdPaused ? 'rgba(234,179,8,0.4)' : 'rgba(16,185,129,0.4)'}`
                }}
              >
                {playbackState.bottomAdPaused ? 'TICKER: PAUSED (HOLD)' : 'TICKER: RUNNING'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {playbackState.bottomAdPaused ? (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('RESUME')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', fontWeight: 700, justifyContent: 'center' }}
                >
                  <Play size={15} /> Resume Ticker Motion
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('HOLD')}
                  className="btn btn-sm"
                  style={{ width: '100%', background: '#eab308', color: '#000', fontWeight: 800, justifyContent: 'center' }}
                >
                  <Pause size={15} /> Hold Ticker
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Ads Control (NEW) */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>SIDEBAR AD DOCKS</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: playbackState.sidebarAdsEnabled !== false ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                  color: playbackState.sidebarAdsEnabled !== false ? '#10b981' : '#ef4444',
                  border: `1px solid ${playbackState.sidebarAdsEnabled !== false ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`
                }}
              >
                {playbackState.sidebarAdsEnabled !== false ? 'SIDEBARS: ACTIVE' : 'SIDEBARS: OFF'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {playbackState.sidebarAdsEnabled !== false ? (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('STOP_SIDEBARS')}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontWeight: 700, justifyContent: 'center' }}
                >
                  <StopCircle size={15} /> Hide Sidebars
                </button>
              ) : (
                <button
                  disabled={actionLoading}
                  onClick={() => handleControlAction('START_SIDEBARS')}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', fontWeight: 700, justifyContent: 'center' }}
                >
                  <Play size={15} /> Show Sidebars
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Signage Ad Zone Dimensions & Live Mini-Preview ── */}
        <div style={{
          marginTop: '1.25rem',
          background: 'rgba(0,0,0,0.35)',
          padding: '1.25rem',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="var(--accent-primary)" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>
                  Signage Display Ad Zones (Live Dimensions &amp; Real-Time Sync)
                </h4>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Configure exact pixel dimensions for Top Banner, Left/Right Sidebars, and Bottom Ticker. Updates live on Smart TV displays via WebSocket.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 700,
                background: venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL' ? '#f59e0b' : '#10b981',
                border: `1px solid ${venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
              }}>
                {venueFilter && venueFilter !== 'ALL' && venueFilter !== 'GLOBAL'
                  ? `Scope: ${venueMap[venueFilter] || 'Selected Venue'} (Overrides Global)`
                  : 'Scope: Global (All Venues)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (zoneOrientationTab === 'PORTRAIT') {
                    handleResetPortraitZone('ALL');
                  } else if (zoneOrientationTab === 'MOBILE') {
                    handleResetMobileZone('ALL');
                  } else if (zoneOrientationTab === 'STREAM') {
                    handleResetStreamZone('ALL');
                  } else {
                    handleResetZone('ALL');
                  }
                }}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                title="Reset all zones to default sizes"
              >
                Reset All Zones ({zoneOrientationTab === 'PORTRAIT' ? 'Portrait' : zoneOrientationTab === 'MOBILE' ? 'Mobile' : zoneOrientationTab === 'STREAM' ? 'Stream' : 'Landscape'})
              </button>
            </div>
          </div>

          {/* Orientation Mode Switcher: Landscape (16:9) vs Portrait (9:16) vs Mobile (Live Viewer) vs Stream */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setZoneOrientationTab('LANDSCAPE')}
              style={{
                background: zoneOrientationTab === 'LANDSCAPE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: zoneOrientationTab === 'LANDSCAPE' ? '#10b981' : '#94a3b8',
                border: `1px solid ${zoneOrientationTab === 'LANDSCAPE' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🖥️ Landscape (16:9 TV &amp; Signage)
            </button>
            <button
              type="button"
              onClick={() => setZoneOrientationTab('PORTRAIT')}
              style={{
                background: zoneOrientationTab === 'PORTRAIT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: zoneOrientationTab === 'PORTRAIT' ? '#10b981' : '#94a3b8',
                border: `1px solid ${zoneOrientationTab === 'PORTRAIT' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📱 Portrait (9:16 Vertical Displays)
            </button>
            <button
              type="button"
              onClick={() => setZoneOrientationTab('MOBILE')}
              style={{
                background: zoneOrientationTab === 'MOBILE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: zoneOrientationTab === 'MOBILE' ? '#10b981' : '#94a3b8',
                border: `1px solid ${zoneOrientationTab === 'MOBILE' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              📲 Mobile (Live Viewer Strips)
            </button>
            <button
              type="button"
              onClick={() => setZoneOrientationTab('STREAM')}
              style={{
                background: zoneOrientationTab === 'STREAM' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                color: zoneOrientationTab === 'STREAM' ? '#10b981' : '#94a3b8',
                border: `1px solid ${zoneOrientationTab === 'STREAM' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              🎥 Stream (Live Match Viewer)
            </button>
          </div>

          {zoneOrientationTab === 'LANDSCAPE' ? (

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            {/* Left Column: Sliders & Numeric Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Top Banner Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} color="#ef4444" /> Top Banner Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={40}
                      max={350}
                      value={currentZoneSizes.topHeight}
                      onChange={(e) => handleZoneSizeChange('topHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetZone('topHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (120)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={40}
                  max={350}
                  step={2}
                  value={currentZoneSizes.topHeight}
                  onChange={(e) => handleZoneSizeChange('topHeight', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>40px (Slim)</span>
                  <span>120px (Default)</span>
                  <span>350px (Prominent)</span>
                </div>
              </div>

              {/* Left Sidebar Width */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowLeft size={14} color="#3b82f6" /> Left Sidebar Width
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={80}
                      max={400}
                      value={currentZoneSizes.leftWidth}
                      onChange={(e) => handleZoneSizeChange('leftWidth', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetZone('leftWidth')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (220)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={80}
                  max={400}
                  step={5}
                  value={currentZoneSizes.leftWidth}
                  onChange={(e) => handleZoneSizeChange('leftWidth', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>80px</span>
                  <span>220px (Default)</span>
                  <span>400px</span>
                </div>
              </div>

              {/* Right Sidebar Width */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowRight size={14} color="#3b82f6" /> Right Sidebar Width
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={80}
                      max={400}
                      value={currentZoneSizes.rightWidth}
                      onChange={(e) => handleZoneSizeChange('rightWidth', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetZone('rightWidth')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (220)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={80}
                  max={400}
                  step={5}
                  value={currentZoneSizes.rightWidth}
                  onChange={(e) => handleZoneSizeChange('rightWidth', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>80px</span>
                  <span>220px (Default)</span>
                  <span>400px</span>
                </div>
              </div>

              {/* Bottom Ticker Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={14} color="#f59e0b" /> Bottom Ticker Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={40}
                      max={200}
                      value={currentZoneSizes.bottomHeight}
                      onChange={(e) => handleZoneSizeChange('bottomHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetZone('bottomHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (70)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={40}
                  max={200}
                  step={2}
                  value={currentZoneSizes.bottomHeight}
                  onChange={(e) => handleZoneSizeChange('bottomHeight', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>40px</span>
                  <span>70px (Default)</span>
                  <span>200px</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Mini-Preview of 16:9 Display */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'flex-start' }}>
                Live Mini-Preview (16:9 Signage Screen)
              </div>
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#070a12',
                borderRadius: 10,
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                position: 'relative'
              }}>
                {/* Top Banner Zone */}
                {playbackState.adsEnabled && (
                  <div style={{
                    height: `${Math.max(10, Math.min(26, (currentZoneSizes.topHeight / 350) * 26))}%`,
                    background: 'rgba(239, 68, 68, 0.25)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0
                  }}>
                    TOP ZONE ({currentZoneSizes.topHeight}px)
                  </div>
                )}

                {/* Center Row: Left Sidebar + Match Grid + Right Sidebar */}
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  {/* Left Sidebar Zone */}
                  {playbackState.adsEnabled && playbackState.sidebarAdsEnabled !== false && (
                    <div style={{
                      width: `${Math.max(12, Math.min(28, (currentZoneSizes.leftWidth / 400) * 28))}%`,
                      background: 'rgba(59, 130, 246, 0.22)',
                      borderRight: '1px solid rgba(59, 130, 246, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      textAlign: 'center',
                      transition: 'width 0.2s ease',
                      flexShrink: 0
                    }}>
                      LEFT ({currentZoneSizes.leftWidth}px)
                    </div>
                  )}

                  {/* Center Match Grid Canvas */}
                  <div style={{
                    flex: 1,
                    background: 'rgba(16, 185, 129, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.4rem',
                    textAlign: 'center',
                    color: '#10b981',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    minWidth: 0
                  }}>
                    <span>SCOREBOARD MATCH GRID</span>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                      {playbackState.sidebarAdsEnabled === false ? 'Sidebars hidden: Grid expanded 100%' : 'Dynamic width with sidebars active'}
                    </span>
                  </div>

                  {/* Right Sidebar Zone */}
                  {playbackState.adsEnabled && playbackState.sidebarAdsEnabled !== false && (
                    <div style={{
                      width: `${Math.max(12, Math.min(28, (currentZoneSizes.rightWidth / 400) * 28))}%`,
                      background: 'rgba(59, 130, 246, 0.22)',
                      borderLeft: '1px solid rgba(59, 130, 246, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      writingMode: 'vertical-rl',
                      textAlign: 'center',
                      transition: 'width 0.2s ease',
                      flexShrink: 0
                    }}>
                      RIGHT ({currentZoneSizes.rightWidth}px)
                    </div>
                  )}
                </div>

                {/* Bottom Ticker Zone */}
                {playbackState.adsEnabled && (
                  <div style={{
                    height: `${Math.max(8, Math.min(20, (currentZoneSizes.bottomHeight / 200) * 20))}%`,
                    background: 'rgba(245, 158, 11, 0.22)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0
                  }}>
                    BOTTOM TICKER ({currentZoneSizes.bottomHeight}px)
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Instant WebSocket sync active
              </div>
            </div>
          </div>
          ) : zoneOrientationTab === 'PORTRAIT' ? (
          /* ── PORTRAIT (9:16) AD ZONES & LIVE MINI-PREVIEW ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            {/* Left Column: Portrait Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Portrait Top Banner Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} color="#ef4444" /> Portrait Top Banner Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={60}
                      max={400}
                      value={currentPortraitZoneSizes.topHeight}
                      onChange={(e) => handlePortraitZoneSizeChange('topHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetPortraitZone('topHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (160)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={60}
                  max={400}
                  step={4}
                  value={currentPortraitZoneSizes.topHeight}
                  onChange={(e) => handlePortraitZoneSizeChange('topHeight', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>60px (Slim)</span>
                  <span>160px (Default)</span>
                  <span>400px (Prominent)</span>
                </div>
              </div>

              {/* Portrait Bottom Ticker Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={14} color="#f59e0b" /> Portrait Bottom Ticker Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={40}
                      max={200}
                      value={currentPortraitZoneSizes.bottomHeight}
                      onChange={(e) => handlePortraitZoneSizeChange('bottomHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetPortraitZone('bottomHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (80)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={40}
                  max={200}
                  step={2}
                  value={currentPortraitZoneSizes.bottomHeight}
                  onChange={(e) => handlePortraitZoneSizeChange('bottomHeight', e.target.value)}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>40px</span>
                  <span>80px (Default)</span>
                  <span>200px</span>
                </div>
              </div>

              {/* Sidebar Ads Behavior in Portrait */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    Sidebars Placement in Portrait
                  </label>
                  <select
                    value={currentPortraitZoneSizes.sidebarsMode || 'STRIP'}
                    onChange={(e) => handlePortraitZoneSizeChange('sidebarsMode', e.target.value)}
                    style={{ ...selectStyle, padding: '4px 10px', fontSize: '0.82rem' }}
                  >
                    <option value="STRIP" style={optionStyle}>Horizontal Sponsor Strips</option>
                    <option value="HIDDEN" style={optionStyle}>Hide Sidebars in Portrait</option>
                  </select>
                </div>
                {currentPortraitZoneSizes.sidebarsMode === 'STRIP' && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Sponsor Strip Height</span>
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>{currentPortraitZoneSizes.sidebarStripHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={200}
                      step={2}
                      value={currentPortraitZoneSizes.sidebarStripHeight}
                      onChange={(e) => handlePortraitZoneSizeChange('sidebarStripHeight', e.target.value)}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary, #10b981)' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Mini-Preview of 9:16 Portrait Display */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'flex-start' }}>
                Live Mini-Preview (9:16 Portrait Screen)
              </div>
              <div style={{
                width: '180px',
                height: '320px',
                background: '#070a12',
                borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                position: 'relative'
              }}>
                {/* Top Banner Zone */}
                {playbackState.adsEnabled && (
                  <div style={{
                    height: `${Math.max(12, Math.min(25, (currentPortraitZoneSizes.topHeight / 400) * 25))}%`,
                    background: 'rgba(239, 68, 68, 0.25)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0
                  }}>
                    TOP ({currentPortraitZoneSizes.topHeight}px)
                  </div>
                )}

                {/* Optional Horizontal Sponsor Strip (Above content) */}
                {playbackState.adsEnabled && playbackState.sidebarAdsEnabled !== false && currentPortraitZoneSizes.sidebarsMode === 'STRIP' && (
                  <div style={{
                    height: '24px',
                    background: 'rgba(59, 130, 246, 0.25)',
                    borderBottom: '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60a5fa',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    SIDEBAR ADS STRIP
                  </div>
                )}

                {/* Stacked Matches Arena Preview */}
                <div style={{
                  flex: 1,
                  background: 'rgba(16, 185, 129, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px',
                  gap: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.58rem',
                    color: '#10b981',
                    fontWeight: 800
                  }}>
                    MATCH #1 (LIVE)
                  </div>
                  <div style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.58rem',
                    color: '#10b981',
                    fontWeight: 800
                  }}>
                    MATCH #2 (LIVE)
                  </div>
                </div>

                {/* Bottom Ticker Zone */}
                {playbackState.adsEnabled && (
                  <div style={{
                    height: `${Math.max(8, Math.min(18, (currentPortraitZoneSizes.bottomHeight / 200) * 18))}%`,
                    background: 'rgba(245, 158, 11, 0.22)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0
                  }}>
                    BOTTOM TICKER ({currentPortraitZoneSizes.bottomHeight}px)
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Portrait WebSocket sync active
              </div>
            </div>
          </div>
          ) : zoneOrientationTab === 'MOBILE' ? (
          /* ── MOBILE (LIVE VIEWER STRIPS) AD ZONES & PHONE MINI-PREVIEW ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            {/* Left Column: Mobile Sliders & Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Mobile Top Strip Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} color="#ef4444" /> Mobile Top Strip Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={36}
                      max={160}
                      value={currentMobileZoneSizes.topHeight}
                      onChange={(e) => handleMobileZoneSizeChange('topHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetMobileZone('topHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (64)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={36}
                  max={160}
                  step={2}
                  value={currentMobileZoneSizes.topHeight}
                  onChange={(e) => handleMobileZoneSizeChange('topHeight', e.target.value)}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>36px (Compact)</span>
                  <span>Default: 64px (Under App Header)</span>
                  <span>160px (Tall)</span>
                </div>
              </div>

              {/* Mobile Top Strip Speed */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={14} color="#ef4444" /> Top Strip Scroll Speed
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={15}
                      max={150}
                      value={currentMobileZoneSizes.topSpeed || 50}
                      onChange={(e) => handleMobileZoneSizeChange('topSpeed', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px/s</span>
                    <button
                      type="button"
                      onClick={() => handleResetMobileZone('topSpeed')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (50)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={currentMobileZoneSizes.topSpeed || 50}
                  onChange={(e) => handleMobileZoneSizeChange('topSpeed', e.target.value)}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>15 px/s (Slow)</span>
                  <span>Default: 50 px/s (Right → Left)</span>
                  <span>150 px/s (Fast)</span>
                </div>
              </div>

              {/* Mobile Bottom Strip Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} color="#f59e0b" /> Mobile Bottom Strip Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={36}
                      max={140}
                      value={currentMobileZoneSizes.bottomHeight}
                      onChange={(e) => handleMobileZoneSizeChange('bottomHeight', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetMobileZone('bottomHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (56)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={36}
                  max={140}
                  step={2}
                  value={currentMobileZoneSizes.bottomHeight}
                  onChange={(e) => handleMobileZoneSizeChange('bottomHeight', e.target.value)}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>36px (Slim)</span>
                  <span>Default: 56px (Docked at Bottom)</span>
                  <span>140px (Prominent)</span>
                </div>
              </div>

              {/* Mobile Bottom Strip Speed */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={14} color="#f59e0b" /> Bottom Strip Scroll Speed
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min={15}
                      max={150}
                      value={currentMobileZoneSizes.bottomSpeed || 40}
                      onChange={(e) => handleMobileZoneSizeChange('bottomSpeed', e.target.value)}
                      style={{ ...inputStyle, width: '70px', padding: '4px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>px/s</span>
                    <button
                      type="button"
                      onClick={() => handleResetMobileZone('bottomSpeed')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (40)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={currentMobileZoneSizes.bottomSpeed || 40}
                  onChange={(e) => handleMobileZoneSizeChange('bottomSpeed', e.target.value)}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  <span>15 px/s (Slow)</span>
                  <span>Default: 40 px/s (Left → Right)</span>
                  <span>150 px/s (Fast)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Phone-Shaped Mini-Preview (approx 9:19.5 aspect ratio) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                LIVE VIEWER SCREEN MOCKUP (9:19.5 PHONE)
              </div>
              <div
                style={{
                  width: '210px',
                  height: '425px',
                  borderRadius: '28px',
                  border: '3px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
                  background: '#090d16',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Phone Speaker Notch */}
                <div style={{
                  width: 54,
                  height: 10,
                  borderRadius: 6,
                  background: '#000000',
                  margin: '6px auto 3px',
                  flexShrink: 0
                }} />

                {/* Mini App Header */}
                <div style={{
                  padding: '4px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#10b981' }}>🏆 TurfSpot</span>
                  <span style={{ fontSize: '0.52rem', color: '#94a3b8' }}>Live Sync</span>
                </div>

                {/* Top Mobile Ad Strip Preview */}
                {playbackState.adsEnabled ? (
                  <div style={{
                    height: `${Math.max(24, Math.min(46, (currentMobileZoneSizes.topHeight / 64) * 32))}px`,
                    background: 'rgba(239, 68, 68, 0.22)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                    fontSize: '0.54rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0,
                    textAlign: 'center',
                    padding: '0 4px'
                  }}>
                    TOP STRIP ({currentMobileZoneSizes.topHeight}px · {currentMobileZoneSizes.topSpeed || 50}px/s · RTL)
                  </div>
                ) : (
                  <div style={{ height: 18, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ADS STOPPED (COLLAPSED)
                  </div>
                )}

                {/* Match Header Card Preview */}
                <div style={{
                  margin: '4px 8px',
                  padding: '6px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '0.52rem', color: '#10b981', fontWeight: 800 }}>PICKLEBALL • LIVE</div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fff' }}>Team A (A1)</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981' }}>13 - 12</span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fff' }}>Team B (A3)</span>
                  </div>
                </div>

                {/* Sample Court with On-Court Scores */}
                <div style={{
                  flex: 1,
                  margin: '0 8px 4px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                  border: '1.5px solid #10b981',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  boxShadow: 'inset 0 0 12px rgba(0,0,0,0.4)'
                }}>
                  {/* Center Net Line */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1.5, background: 'rgba(255,255,255,0.7)', zIndex: 2 }} />

                  {/* Left Half (Team A) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', position: 'relative' }}>
                    <div style={{ fontSize: '0.54rem', fontWeight: 800, color: '#ffffff', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4 }}>
                      Team A
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      13
                    </div>
                    <div style={{ fontSize: '0.5rem', fontWeight: 800, color: '#047857', background: '#34d399', padding: '1px 5px', borderRadius: 4 }}>
                      SERVE #1
                    </div>
                  </div>

                  {/* Right Half (Team B) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', position: 'relative' }}>
                    <div style={{ fontSize: '0.54rem', fontWeight: 800, color: '#ffffff', background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4 }}>
                      Team B
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                      12
                    </div>
                    <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>
                      RECEIVE
                    </div>
                  </div>
                </div>

                {/* Bottom Mobile Ad Strip Preview */}
                {playbackState.adsEnabled ? (
                  <div style={{
                    height: `${Math.max(22, Math.min(42, (currentMobileZoneSizes.bottomHeight / 56) * 28))}px`,
                    background: 'rgba(245, 158, 11, 0.22)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    fontSize: '0.54rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    transition: 'height 0.2s ease',
                    flexShrink: 0,
                    textAlign: 'center',
                    padding: '0 4px'
                  }}>
                    BOTTOM STRIP ({currentMobileZoneSizes.bottomHeight}px · {currentMobileZoneSizes.bottomSpeed || 40}px/s · LTR)
                  </div>
                ) : (
                  <div style={{ height: 18, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ADS STOPPED (COLLAPSED)
                  </div>
                )}

                {/* Home Indicator */}
                <div style={{
                  width: 50,
                  height: 3,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.4)',
                  margin: '4px auto 3px',
                  flexShrink: 0
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Mobile Live Viewer WebSocket sync active
              </div>
            </div>
          </div>
          ) : (
          /* ── STREAM (LIVE STREAM PLAYER) AD ZONES & 16:9 PLAYER MINI-PREVIEW ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            {/* Left Column: Stream Sliders & Numeric Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Stream Top Strip Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={13} color="#ef4444" /> Stream Top Strip Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={30}
                      max={120}
                      value={currentStreamZoneSizes.topHeight}
                      onChange={(e) => handleStreamZoneSizeChange('topHeight', e.target.value)}
                      style={{ ...inputStyle, width: '65px', padding: '3px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetStreamZone('topHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (48)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={2}
                  value={currentStreamZoneSizes.topHeight}
                  onChange={(e) => handleStreamZoneSizeChange('topHeight', e.target.value)}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>

              {/* Stream Top Speed */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={13} color="#ef4444" /> Top Strip Scroll Speed
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={15}
                      max={150}
                      value={currentStreamZoneSizes.topSpeed || 45}
                      onChange={(e) => handleStreamZoneSizeChange('topSpeed', e.target.value)}
                      style={{ ...inputStyle, width: '65px', padding: '3px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>px/s</span>
                    <button
                      type="button"
                      onClick={() => handleResetStreamZone('topSpeed')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (45)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={currentStreamZoneSizes.topSpeed || 45}
                  onChange={(e) => handleStreamZoneSizeChange('topSpeed', e.target.value)}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>

              {/* Stream Bottom Strip Height */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={13} color="#f59e0b" /> Stream Bottom Strip Height
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={30}
                      max={120}
                      value={currentStreamZoneSizes.bottomHeight}
                      onChange={(e) => handleStreamZoneSizeChange('bottomHeight', e.target.value)}
                      style={{ ...inputStyle, width: '65px', padding: '3px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>px</span>
                    <button
                      type="button"
                      onClick={() => handleResetStreamZone('bottomHeight')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (52)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={2}
                  value={currentStreamZoneSizes.bottomHeight}
                  onChange={(e) => handleStreamZoneSizeChange('bottomHeight', e.target.value)}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </div>

              {/* Stream Bottom Speed */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Move size={13} color="#f59e0b" /> Bottom Strip Scroll Speed
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min={15}
                      max={150}
                      value={currentStreamZoneSizes.bottomSpeed || 45}
                      onChange={(e) => handleStreamZoneSizeChange('bottomSpeed', e.target.value)}
                      style={{ ...inputStyle, width: '65px', padding: '3px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>px/s</span>
                    <button
                      type="button"
                      onClick={() => handleResetStreamZone('bottomSpeed')}
                      className="btn btn-sm"
                      style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}
                    >
                      Reset (45)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={currentStreamZoneSizes.bottomSpeed || 45}
                  onChange={(e) => handleStreamZoneSizeChange('bottomSpeed', e.target.value)}
                  style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </div>

              {/* Left & Right Sidebar Widths in 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {/* Left Width */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ArrowLeft size={12} color="#3b82f6" /> Left Width
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="number"
                        min={80}
                        max={260}
                        value={currentStreamZoneSizes.leftWidth}
                        onChange={(e) => handleStreamZoneSizeChange('leftWidth', e.target.value)}
                        style={{ ...inputStyle, width: '56px', padding: '2px 4px', fontSize: '0.78rem', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={260}
                    step={5}
                    value={currentStreamZoneSizes.leftWidth}
                    onChange={(e) => handleStreamZoneSizeChange('leftWidth', e.target.value)}
                    style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                </div>

                {/* Right Width */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ArrowRight size={12} color="#3b82f6" /> Right Width
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <input
                        type="number"
                        min={80}
                        max={260}
                        value={currentStreamZoneSizes.rightWidth}
                        onChange={(e) => handleStreamZoneSizeChange('rightWidth', e.target.value)}
                        style={{ ...inputStyle, width: '56px', padding: '2px 4px', fontSize: '0.78rem', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={260}
                    step={5}
                    value={currentStreamZoneSizes.rightWidth}
                    onChange={(e) => handleStreamZoneSizeChange('rightWidth', e.target.value)}
                    style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Intervals (Sidebar Rotate & Break Crossfade) in 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '0.2rem' }}>
                    Sidebar Rotate: {currentStreamZoneSizes.rotateInterval}s
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    step={1}
                    value={currentStreamZoneSizes.rotateInterval}
                    onChange={(e) => handleStreamZoneSizeChange('rotateInterval', e.target.value)}
                    style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '0.2rem' }}>
                    Break Crossfade: {currentStreamZoneSizes.breakInterval}s
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    step={1}
                    value={currentStreamZoneSizes.breakInterval}
                    onChange={(e) => handleStreamZoneSizeChange('breakInterval', e.target.value)}
                    style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Mobile Portrait toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  checked={currentStreamZoneSizes.hideSidebarsOnMobile !== false}
                  onChange={(e) => handleStreamZoneSizeChange('hideSidebarsOnMobile', e.target.checked)}
                  style={{ accentColor: '#10b981', cursor: 'pointer' }}
                />
                Auto-hide Left &amp; Right stream sidebars on small mobile portrait screens
              </label>
            </div>

            {/* Right Column: Live 16:9 Stream Player Mockup */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px' }}>
                LIVE STREAM PLAYER MOCKUP (16:9 BROADCAST)
              </div>
              <div
                style={{
                  width: '380px',
                  maxWidth: '100%',
                  height: '240px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
                  background: '#040711',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Top Stream Strip */}
                {playbackState.adsEnabled ? (
                  <div style={{
                    height: `${Math.max(20, Math.min(38, (currentStreamZoneSizes.topHeight / 48) * 26))}px`,
                    background: 'rgba(239, 68, 68, 0.22)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171',
                    fontSize: '0.56rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    flexShrink: 0,
                    textAlign: 'center',
                    padding: '0 6px'
                  }}>
                    STREAM TOP ({currentStreamZoneSizes.topHeight}px · {currentStreamZoneSizes.topSpeed || 45}px/s · RTL)
                  </div>
                ) : (
                  <div style={{ height: 16, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ADS STOPPED
                  </div>
                )}

                {/* Middle Row: Left Sidebar + Center Video + Right Sidebar */}
                <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
                  {/* Left Sidebar */}
                  {playbackState.adsEnabled && (
                    <div style={{
                      width: `${Math.max(38, Math.min(65, (currentStreamZoneSizes.leftWidth / 140) * 48))}px`,
                      background: 'rgba(59, 130, 246, 0.22)',
                      borderRight: '1px solid rgba(59, 130, 246, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa',
                      fontSize: '0.52rem',
                      fontWeight: 800,
                      writingMode: 'vertical-rl',
                      textAlign: 'center',
                      flexShrink: 0
                    }}>
                      LEFT ({currentStreamZoneSizes.leftWidth}px)
                    </div>
                  )}

                  {/* Center Video Area */}
                  <div style={{
                    flex: 1,
                    background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '8px'
                  }}>
                    {/* Top video controls header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.55rem', fontWeight: 800, background: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                        ● LIVE
                      </span>
                      <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 3 }}>
                        👁️ 2 Viewers
                      </span>
                    </div>

                    {/* Court net visual representation in background */}
                    <div style={{ textAlign: 'center', opacity: 0.25, fontSize: '1.4rem' }}>🎾</div>

                    {/* Lower-third Scoreboard Overlay Mockup */}
                    <div style={{
                      background: 'rgba(10, 15, 29, 0.92)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>Team A (A1)</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                        13 - 12
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>Team B (A3)</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '1px 3px', borderRadius: 3 }}>G1</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Sidebar */}
                  {playbackState.adsEnabled && (
                    <div style={{
                      width: `${Math.max(38, Math.min(65, (currentStreamZoneSizes.rightWidth / 140) * 48))}px`,
                      background: 'rgba(59, 130, 246, 0.22)',
                      borderLeft: '1px solid rgba(59, 130, 246, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60a5fa',
                      fontSize: '0.52rem',
                      fontWeight: 800,
                      writingMode: 'vertical-rl',
                      textAlign: 'center',
                      flexShrink: 0
                    }}>
                      RIGHT ({currentStreamZoneSizes.rightWidth}px)
                    </div>
                  )}
                </div>

                {/* Bottom Stream Strip */}
                {playbackState.adsEnabled ? (
                  <div style={{
                    height: `${Math.max(22, Math.min(40, (currentStreamZoneSizes.bottomHeight / 52) * 28))}px`,
                    background: 'rgba(245, 158, 11, 0.22)',
                    borderTop: '1px solid rgba(245, 158, 11, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    fontSize: '0.56rem',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    flexShrink: 0,
                    textAlign: 'center',
                    padding: '0 6px'
                  }}>
                    STREAM BOTTOM ({currentStreamZoneSizes.bottomHeight}px · {currentStreamZoneSizes.bottomSpeed || 45}px/s · LTR)
                  </div>
                ) : (
                  <div style={{ height: 16, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ADS STOPPED
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Stream Player WebSocket sync active
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ── 1. TOP ADVERTISEMENTS TABLE ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-primary)" /> Top Advertisements (Banner / Leaderboard)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Displays at the top of signage and tournament headers. Configurable dimensions, presets &amp; aspect-ratio fitting.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-muted)' }}>
            {topAds.length} configured
          </span>
        </div>

        {topAds.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 12 }}>
            No top advertisements configured. Click &quot;Configure &amp; Upload Ad&quot; above to create one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Dimensions / Preset</th>
                  <th>Fit</th>
                  <th>Motion</th>
                  <th>Tournament</th>
                  <th>Venue</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topAds.map(ad => (
                  <tr key={ad.id}>
                    <td>
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        onClick={() => setPreviewModal(ad)}
                        style={{ width: 80, height: 36, objectFit: ad.imageFit || 'contain', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{ad.title}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {ad.width || '100%'} × {ad.height || 'auto'}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.sizePreset}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                        {ad.imageFit || 'contain'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ad.motionType === 'STATIC' ? 'var(--text-muted)' : 'var(--accent-primary)' }}>
                        {ad.motionType || 'STATIC'}
                      </span>
                    </td>
                    <td>
                      {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                          All Tournaments
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {!ad.venueIds || ad.venueIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                          All Venues
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                    </td>
                    <td>
                      <span
                        onClick={() => handleToggleStatus(ad)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                        }}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. LEFT & RIGHT SIDEBAR ADVERTISEMENTS (NEW) ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Move size={18} color="var(--accent-secondary, #06b6d4)" /> Left &amp; Right Sidebar Advertisements (Tall Placements)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Docked on the left or right side of tournament scoreboards. Supports vertical scrolling (bottom-to-top), carousels &amp; skyscraper presets.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-muted)' }}>
            {sidebarAds.length} configured
          </span>
        </div>

        {sidebarAds.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 12 }}>
            No sidebar advertisements created yet. Choose &quot;Left Sidebar&quot;, &quot;Right Sidebar&quot;, or &quot;Both Sidebars&quot; when creating an ad.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Side</th>
                  <th>Dimensions / Preset</th>
                  <th>Fit</th>
                  <th>Motion &amp; Direction</th>
                  <th>Tournament</th>
                  <th>Venue</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sidebarAds.map(ad => (
                  <tr key={ad.id}>
                    <td>
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        onClick={() => setPreviewModal(ad)}
                        style={{ width: 44, height: 60, objectFit: ad.imageFit || 'contain', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{ad.title}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: ad.position === 'LEFT' ? 'rgba(6,182,212,0.15)' : ad.position === 'RIGHT' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: ad.position === 'LEFT' ? '#06b6d4' : ad.position === 'RIGHT' ? '#a855f7' : '#10b981'
                      }}>
                        {ad.position === 'BOTH_SIDEBARS' ? 'BOTH SIDES' : `${ad.position} SIDEBAR`}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ad.width || '240px'} × {ad.height || 'auto'}</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.sizePreset}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                        {ad.imageFit || 'contain'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{ad.motionType || 'STATIC'}</div>
                      {ad.motionType !== 'STATIC' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.movementDirection} ({ad.speed}s)</div>
                      )}
                    </td>
                    <td>
                      {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                          All Tournaments
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {!ad.venueIds || ad.venueIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                          All Venues
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        onClick={() => handleToggleStatus(ad)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                        }}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 3. BOTTOM ADVERTISEMENTS TABLE ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={18} color="var(--accent-primary)" /> Bottom Advertisements (Continuous Marquee Ticker)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              High-visibility sponsor ribbon with configurable scroll speeds and hold states.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-muted)' }}>
            {bottomAds.length} configured
          </span>
        </div>

        {bottomAds.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 12 }}>
            No bottom ticker advertisements match the current filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Motion Mode</th>
                  <th>Speed</th>
                  <th>Tournament</th>
                  <th>Venue</th>
                  <th>Order</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bottomAds.map(ad => (
                  <tr key={ad.id}>
                    <td>
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        onClick={() => setPreviewModal(ad)}
                        style={{ width: 80, height: 32, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{ad.title}</td>
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {ad.motionType || 'SCROLL'} ({ad.movementDirection || 'RTL'})
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{ad.speed || 25}s</span>
                    </td>
                    <td>
                      {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                          All Tournaments
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {!ad.venueIds || ad.venueIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                          All Venues
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>{ad.sortOrder}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                    </td>
                    <td>
                      <span
                        onClick={() => handleToggleStatus(ad)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                        }}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. COURT ADVERTISEMENTS TABLE ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--accent-primary)" /> Court Surface Advertisements (Pickleball &amp; Badminton Service Boxes)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Embedded within playing court boxes on scorer, match view, Signage TV &amp; Smart TV broadcasts.
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 8, color: 'var(--text-muted)' }}>
            {courtAds.length} configured
          </span>
        </div>

        {courtAds.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 12 }}>
            No court advertisements match the current filter. Click &quot;Configure &amp; Upload Ad&quot; to assign sponsor logos directly inside court boxes.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Position</th>
                  <th>Fit</th>
                  <th>Tournament</th>
                  <th>Venue</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courtAds.map(ad => (
                  <tr key={ad.id}>
                    <td>
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        onClick={() => setPreviewModal(ad)}
                        style={{ width: 60, height: 40, objectFit: ad.imageFit || 'contain', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{ad.title}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: 6, fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        COURT BOX
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                        {ad.imageFit || 'contain'}
                      </span>
                    </td>
                    <td>
                      {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                          All Tournaments
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>
                      {!ad.venueIds || ad.venueIds.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                          All Venues
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                    </td>
                    <td>
                      <span
                        onClick={() => handleToggleStatus(ad)}
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                        }}
                      >
                        {ad.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. MOBILE & COURT MIDDLE ADVERTISEMENTS ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={18} color="var(--accent-primary)" /> Mobile Viewer Ads (Live Match Screen)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Dedicated top &amp; bottom banner strips and vertical court middle strips beside net for viewers on /matches/:id/live with seamless infinite cycling.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {mobileTopAds.length} Top Ads
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {mobileBottomAds.length} Bottom Ads
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {courtMiddleAds.length} Court Middle Strip Ads
            </span>
            <button
              type="button"
              onClick={() => openCreateModal('MOBILE_TOP')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={15} /> Configure &amp; Upload Ad
            </button>
          </div>
        </div>

        {/* ── 5A. MOBILE TOP STRIP ADS TABLE ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
              Mobile Top Strip (Scrolls Right → Left under App Header)
            </h4>
          </div>
          {mobileTopAds.length === 0 ? (
            <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 10, fontSize: '0.85rem' }}>
              No Mobile Top advertisements configured. Click &quot;Configure &amp; Upload Ad&quot; above to create one with position &quot;Mobile Top (Right → Left)&quot;.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Motion</th>
                    <th>Speed</th>
                    <th>Tournament</th>
                    <th>Venue</th>
                    <th>Device</th>
                    <th>Order</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mobileTopAds.map(ad => (
                    <tr key={ad.id}>
                      <td>
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          onClick={() => setPreviewModal(ad)}
                          style={{ width: 80, height: 32, objectFit: ad.imageFit || 'contain', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ad.title}</div>
                        {ad.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.description}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>
                          {ad.motionType || 'SCROLL'} (RTL)
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {ad.speed || 50} px/s
                      </td>
                      <td>
                        {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                            All Tournaments
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        {!ad.venueIds || ad.venueIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                            All Venues
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.devices && ad.devices.length ? ad.devices.join(', ') : 'All Devices'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
                        {ad.sortOrder ?? 0}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                      </td>
                      <td>
                        <span
                          onClick={() => handleToggleStatus(ad)}
                          style={{
                            cursor: 'pointer',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                          }}
                        >
                          {ad.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 5B. MOBILE BOTTOM STRIP ADS TABLE ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
              Mobile Bottom Strip (Scrolls Left → Right docked at Bottom)
            </h4>
          </div>
          {mobileBottomAds.length === 0 ? (
            <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 10, fontSize: '0.85rem' }}>
              No Mobile Bottom advertisements configured. Click &quot;Configure &amp; Upload Ad&quot; above to create one with position &quot;Mobile Bottom (Left → Right)&quot;.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Motion</th>
                    <th>Speed</th>
                    <th>Tournament</th>
                    <th>Venue</th>
                    <th>Device</th>
                    <th>Order</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mobileBottomAds.map(ad => (
                    <tr key={ad.id}>
                      <td>
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          onClick={() => setPreviewModal(ad)}
                          style={{ width: 80, height: 32, objectFit: ad.imageFit || 'contain', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ad.title}</div>
                        {ad.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.description}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>
                          {ad.motionType || 'SCROLL'} (LTR)
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {ad.speed || 40} px/s
                      </td>
                      <td>
                        {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                            All Tournaments
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        {!ad.venueIds || ad.venueIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                            All Venues
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.devices && ad.devices.length ? ad.devices.join(', ') : 'All Devices'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
                        {ad.sortOrder ?? 0}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                      </td>
                      <td>
                        <span
                          onClick={() => handleToggleStatus(ad)}
                          style={{
                            cursor: 'pointer',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                          }}
                        >
                          {ad.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 5C. COURT MIDDLE STRIP ADS TABLE ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
              Court Middle Strip (Vertical Beside Net / Center Line)
            </h4>
          </div>
          {courtMiddleAds.length === 0 ? (
            <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', borderRadius: 10, fontSize: '0.85rem' }}>
              No Court Middle Strip advertisements configured. Click &quot;Configure &amp; Upload Ad&quot; above to create one with position &quot;Court Middle Strip (Vertical Beside Net)&quot;.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Title</th>
                    <th>Motion</th>
                    <th>Speed</th>
                    <th>Tournament</th>
                    <th>Venue</th>
                    <th>Device</th>
                    <th>Order</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courtMiddleAds.map(ad => (
                    <tr key={ad.id}>
                      <td>
                        <img
                          src={ad.imageUrl}
                          alt={ad.title}
                          onClick={() => setPreviewModal(ad)}
                          style={{ width: 44, height: 44, objectFit: ad.imageFit || 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ad.title}</div>
                        {ad.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ad.description}</div>}
                        {ad.linkUrl && (
                          <a href={ad.linkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent-primary, #10b981)', textDecoration: 'none' }}>
                            🔗 Link
                          </a>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                          {ad.motionType || 'STATIC'} (ROTATE)
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {ad.slideInterval ? `${ad.slideInterval}s rotate` : '6s rotate'}
                      </td>
                      <td>
                        {!ad.tournamentIds || ad.tournamentIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                            All Tournaments
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.tournamentIds.map(id => tournamentMap[id] || ad.tournamentName || `Tournament #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        {!ad.venueIds || ad.venueIds.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600 }}>
                            All Venues
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            {ad.venueIds.map(id => venueMap[id] || `Venue #${id}`).join(', ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600 }}>
                          {ad.devices && ad.devices.length ? ad.devices.join(', ') : 'All Devices'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'center' }}>
                        {ad.sortOrder ?? 0}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} → {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Forever'}
                      </td>
                      <td>
                        <span
                          onClick={() => handleToggleStatus(ad)}
                          style={{
                            cursor: 'pointer',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: ad.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: ad.status === 'ACTIVE' ? '#10b981' : '#ef4444'
                          }}
                        >
                          {ad.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => setPreviewModal(ad)} title="Preview" className="btn btn-sm" style={{ padding: '4px 8px' }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEditModal(ad)} title="Edit Advertisement" className="btn btn-sm" style={{ padding: '4px 8px', color: 'var(--accent-primary, #10b981)' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(ad.id)} title="Delete" className="btn btn-sm" style={{ padding: '4px 8px', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. STREAMING SCREEN ADS (LIVE MATCH VIEWER) ── */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#3b82f6" /> Streaming Screen Ads (Live Stream Viewer Player)
            </h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Managed sponsor ads around and over the live video player (Top, Bottom, Left, Right) and full-player Match Break sponsor carousels.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {streamTopAds.length} Top
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {streamBottomAds.length} Bottom
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {streamLeftAds.length} Left · {streamRightAds.length} Right
            </span>
            <span style={{ fontSize: '0.82rem', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
              {streamBreakAds.length} Break
            </span>
            <button
              type="button"
              onClick={() => openCreateModal('STREAM_TOP')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={15} /> Configure &amp; Upload Ad
            </button>
          </div>
        </div>

        {/* 6A. Stream Top Strip Ads */}
        {renderStreamTable('6A. Stream Top Strip (Marquee above video)', streamTopAds, 'STREAM_TOP', '#ef4444')}

        {/* 6B. Stream Bottom Strip Ads */}
        {renderStreamTable('6B. Stream Bottom Strip (Marquee below video)', streamBottomAds, 'STREAM_BOTTOM', '#f59e0b')}

        {/* 6C. Stream Left Sidebar Ads */}
        {renderStreamTable('6C. Stream Left Sidebar (Vertical dock left of video)', streamLeftAds, 'STREAM_LEFT', '#3b82f6')}

        {/* 6D. Stream Right Sidebar Ads */}
        {renderStreamTable('6D. Stream Right Sidebar (Vertical dock right of video)', streamRightAds, 'STREAM_RIGHT', '#3b82f6')}

        {/* 6E. Stream Match Break Ads */}
        {renderStreamTable('6E. Stream Match Break (Full-player sponsor carousel on timeout/interval)', streamBreakAds, 'STREAM_BREAK', '#8b5cf6')}
      </div>

      {/* ── ADVANCED AD CONFIGURATION / UPLOAD MODAL ── */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '1rem'
        }}>
          <div
            className="glass-panel"
            style={{
              width: 820,
              maxWidth: '96vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: 20,
              background: 'var(--bg-modal, #0f172a)',
              color: 'var(--text-main, #ffffff)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>
                  {editingAd ? 'Edit Stadium Advertisement' : 'Upload & Configure Stadium Advertisement'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Set width, height, placement sidebars, and motion animation with live preview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-sm btn-secondary"
                style={{ padding: 6 }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                fontSize: '0.88rem',
                marginBottom: '1rem',
                border: '1px solid rgba(239,68,68,0.3)'
              }}>
                <AlertCircle size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal}>
              {/* SECTION 1: TITLE & PLACEMENT */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                  Ad Title / Sponsor Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Puma Official Athletic Gear Partner"
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              {/* Description and Link URL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    Ad Description / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Official Tournament Sponsor"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    Destination Link URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                    placeholder="https://sponsor.example.com"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Placement Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    Placement Position *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => {
                      const nextPos = e.target.value;
                      let nextMotion = formData.motionType;
                      let nextDir = formData.movementDirection;

                      if (nextPos === 'BOTTOM') {
                        nextMotion = 'SCROLL';
                        nextDir = 'RIGHT_TO_LEFT';
                      } else if (nextPos === 'MOBILE_TOP') {
                        nextMotion = 'SCROLL';
                        nextDir = 'RIGHT_TO_LEFT';
                      } else if (nextPos === 'MOBILE_BOTTOM') {
                        nextMotion = 'SCROLL';
                        nextDir = 'LEFT_TO_RIGHT';
                      } else if (nextPos === 'STREAM_TOP') {
                        nextMotion = 'SCROLL';
                        nextDir = 'RIGHT_TO_LEFT';
                      } else if (nextPos === 'STREAM_BOTTOM') {
                        nextMotion = 'SCROLL';
                        nextDir = 'LEFT_TO_RIGHT';
                      } else if (nextPos === 'STREAM_LEFT' || nextPos === 'STREAM_RIGHT') {
                        nextMotion = 'STATIC';
                        nextDir = 'BOTTOM_TO_TOP';
                      } else if (nextPos === 'STREAM_BREAK') {
                        nextMotion = 'STATIC';
                      } else if (nextPos === 'COURT_MIDDLE') {
                        nextMotion = 'STATIC';
                        nextDir = 'RIGHT_TO_LEFT';
                      } else if (nextPos === 'LEFT' || nextPos === 'RIGHT') {
                        nextDir = 'BOTTOM_TO_TOP';
                      }

                      setFormData(prev => ({
                        ...prev,
                        position: nextPos,
                        motionType: nextMotion,
                        movementDirection: nextDir,
                        height: nextPos === 'MOBILE_TOP' ? '64px' : nextPos === 'MOBILE_BOTTOM' ? '56px' : nextPos === 'STREAM_TOP' ? '48px' : nextPos === 'STREAM_BOTTOM' ? '52px' : nextPos === 'STREAM_BREAK' ? '100%' : nextPos === 'COURT_MIDDLE' ? '240px' : prev.height,
                        heightValue: nextPos === 'MOBILE_TOP' ? 64 : nextPos === 'MOBILE_BOTTOM' ? 56 : nextPos === 'STREAM_TOP' ? 48 : nextPos === 'STREAM_BOTTOM' ? 52 : nextPos === 'STREAM_BREAK' ? 100 : nextPos === 'COURT_MIDDLE' ? 240 : prev.heightValue,
                        heightUnit: nextPos === 'STREAM_BREAK' ? '%' : (nextPos === 'STREAM_LEFT' || nextPos === 'STREAM_RIGHT') ? '%' : prev.heightUnit,
                        width: nextPos === 'COURT_MIDDLE' ? '80px' : (nextPos === 'STREAM_LEFT' || nextPos === 'STREAM_RIGHT') ? '140px' : nextPos === 'STREAM_BREAK' ? '100%' : prev.width,
                        widthValue: nextPos === 'COURT_MIDDLE' ? 80 : (nextPos === 'STREAM_LEFT' || nextPos === 'STREAM_RIGHT') ? 140 : nextPos === 'STREAM_BREAK' ? 100 : prev.widthValue,
                        widthUnit: nextPos === 'COURT_MIDDLE' || nextPos === 'STREAM_LEFT' || nextPos === 'STREAM_RIGHT' ? 'px' : prev.widthUnit,
                        imageFit: nextPos === 'COURT_MIDDLE' ? 'cover' : nextPos === 'STREAM_BREAK' ? 'contain' : prev.imageFit,
                        sizePreset: nextPos === 'STREAM_TOP' ? 'STREAM_TOP_STRIP' : nextPos === 'STREAM_BOTTOM' ? 'STREAM_BOTTOM_STRIP' : nextPos === 'STREAM_LEFT' ? 'STREAM_SIDEBAR_LEFT' : nextPos === 'STREAM_RIGHT' ? 'STREAM_SIDEBAR_RIGHT' : nextPos === 'STREAM_BREAK' ? 'STREAM_BREAK_CARD' : prev.sizePreset
                      }));
                    }}
                    style={{ ...selectStyle, width: '100%' }}
                  >
                    <option value="TOP" style={optionStyle}>Top Banner (Signage Header)</option>
                    <option value="LEFT" style={optionStyle}>Left Sidebar (Tall Vertical Dock)</option>
                    <option value="RIGHT" style={optionStyle}>Right Sidebar (Tall Vertical Dock)</option>
                    <option value="BOTH_SIDEBARS" style={optionStyle}>Both Left &amp; Right Sidebars</option>
                    <option value="BOTTOM" style={optionStyle}>Bottom Banner / Marquee Ticker</option>
                    <option value="COURT" style={optionStyle}>Court Box Overlay (Pickleball &amp; Badminton)</option>
                    <option value="COURT_MIDDLE" style={optionStyle}>Court Middle Strip (Vertical Beside Net)</option>
                    <option value="MOBILE_TOP" style={optionStyle}>Mobile Top (Right → Left)</option>
                    <option value="MOBILE_BOTTOM" style={optionStyle}>Mobile Bottom (Left → Right)</option>
                    <option value="STREAM_TOP" style={optionStyle}>Stream Top (Above Viewer Video Player)</option>
                    <option value="STREAM_BOTTOM" style={optionStyle}>Stream Bottom (Below Viewer Video Player)</option>
                    <option value="STREAM_LEFT" style={optionStyle}>Stream Left Sidebar (Beside Viewer Video)</option>
                    <option value="STREAM_RIGHT" style={optionStyle}>Stream Right Sidebar (Beside Viewer Video)</option>
                    <option value="STREAM_BREAK" style={optionStyle}>Stream Match Break (Full-Player Sponsor Card)</option>
                  </select>
                </div>

                {/* Size Preset Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    Size Preset
                  </label>
                  <select
                    value={formData.sizePreset}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    style={{ ...selectStyle, width: '100%' }}
                  >
                    {PRESET_SIZES.map(p => (
                      <option key={p.id} value={p.id} style={optionStyle}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 2: AD DIMENSIONS & FIT CONTROLS */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Sliders size={16} color="var(--accent-primary, #10b981)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Dimensions &amp; Image Fit Controls</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '0.75rem' }}>
                  {/* Width Control */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Width</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="number"
                        min={10}
                        max={3000}
                        value={formData.widthValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            sizePreset: 'CUSTOM',
                            widthValue: val,
                            width: `${val}${prev.widthUnit}`
                          }));
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <select
                        value={formData.widthUnit}
                        onChange={(e) => {
                          const u = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            sizePreset: 'CUSTOM',
                            widthUnit: u,
                            width: `${prev.widthValue}${u}`
                          }));
                        }}
                        style={{ ...selectStyle, width: 70 }}
                      >
                        <option value="px" style={optionStyle}>px</option>
                        <option value="%" style={optionStyle}>%</option>
                        <option value="vw" style={optionStyle}>vw</option>
                      </select>
                    </div>
                  </div>

                  {/* Height Control */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Height</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="number"
                        min={10}
                        max={2000}
                        value={formData.heightValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            sizePreset: 'CUSTOM',
                            heightValue: val,
                            height: `${val}${prev.heightUnit}`
                          }));
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <select
                        value={formData.heightUnit}
                        onChange={(e) => {
                          const u = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            sizePreset: 'CUSTOM',
                            heightUnit: u,
                            height: `${prev.heightValue}${u}`
                          }));
                        }}
                        style={{ ...selectStyle, width: 70 }}
                      >
                        <option value="px" style={optionStyle}>px</option>
                        <option value="vh" style={optionStyle}>vh</option>
                        <option value="%" style={optionStyle}>%</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Fit Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Image Fit (Preserve Ratio)</label>
                    <select
                      value={formData.imageFit}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageFit: e.target.value }))}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      <option value="contain" style={optionStyle}>Contain (Preserve Full Asset)</option>
                      <option value="cover" style={optionStyle}>Cover (Fill Container Edge-to-Edge)</option>
                      <option value="fill" style={optionStyle}>Fill (Stretch to Exactly Match)</option>
                      <option value="scale-down" style={optionStyle}>Scale-Down</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: MOTION & ANIMATION SETTINGS */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Move size={16} color="var(--accent-secondary, #06b6d4)" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Display Behavior &amp; Movement Motion</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '0.85rem' }}>
                  {/* Motion Type */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Motion Mode</label>
                    <select
                      value={formData.motionType}
                      onChange={(e) => setFormData(prev => ({ ...prev, motionType: e.target.value }))}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      <option value="STATIC" style={optionStyle}>Static (Stationary Display)</option>
                      <option value="SCROLL" style={optionStyle}>Continuous Scroll (Marquee)</option>
                      <option value="CAROUSEL" style={optionStyle}>Auto Carousel Slideshow</option>
                      <option value="SLIDE" style={optionStyle}>Slide-In Transition</option>
                      <option value="CROSSFADE" style={optionStyle}>Smooth Crossfade</option>
                    </select>
                  </div>

                  {/* Movement Direction */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Direction</label>
                    <select
                      value={formData.movementDirection}
                      disabled={formData.motionType === 'STATIC'}
                      onChange={(e) => setFormData(prev => ({ ...prev, movementDirection: e.target.value }))}
                      style={{ ...selectStyle, width: '100%', opacity: formData.motionType === 'STATIC' ? 0.6 : 1 }}
                    >
                      <option value="RIGHT_TO_LEFT" style={optionStyle}>Right → Left (Horizontal)</option>
                      <option value="LEFT_TO_RIGHT" style={optionStyle}>Left → Right (Horizontal)</option>
                      <option value="BOTTOM_TO_TOP" style={optionStyle}>Bottom → Top (Vertical)</option>
                      <option value="TOP_TO_BOTTOM" style={optionStyle}>Top → Bottom (Vertical)</option>
                    </select>
                  </div>

                  {/* Animation Speed / Slide Interval */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                      {formData.motionType === 'CAROUSEL' ? 'Slide Interval (Seconds)' : 'Scroll Duration (Seconds)'}
                    </label>
                    <input
                      type="number"
                      min={formData.motionType === 'CAROUSEL' ? 3 : 5}
                      max={90}
                      value={formData.motionType === 'CAROUSEL' ? formData.slideInterval : formData.speed}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 10;
                        if (formData.motionType === 'CAROUSEL') {
                          setFormData(prev => ({ ...prev, slideInterval: val }));
                        } else {
                          setFormData(prev => ({ ...prev, speed: val }));
                        }
                      }}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </div>
                </div>

                {/* Pause on Hover */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.pauseOnHover}
                    onChange={(e) => setFormData(prev => ({ ...prev, pauseOnHover: e.target.checked }))}
                  />
                  <span>Pause animation / rotation when user hovers over the advertisement</span>
                </label>
              </div>

              {/* SECTION 4: LIVE PREVIEW OF SELECTED CONFIGURATION */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Eye size={16} color="var(--accent-primary, #10b981)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Live Configuration Preview</span>
                  </div>

                  {/* Device Switcher */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {[
                      { id: 'signage', label: 'Signage TV', icon: <Monitor size={13} /> },
                      { id: 'desktop', label: 'Desktop', icon: <Monitor size={13} /> },
                      { id: 'tablet', label: 'Tablet', icon: <Tablet size={13} /> },
                      { id: 'mobile', label: 'Mobile', icon: <Smartphone size={13} /> }
                    ].map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setPreviewDevice(d.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: previewDevice === d.id ? 'var(--accent-primary, #10b981)' : 'rgba(255,255,255,0.06)',
                          color: previewDevice === d.id ? '#ffffff' : 'var(--text-muted)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {d.icon} {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Viewport Frame */}
                <div style={{
                  width: '100%',
                  background: 'var(--display-bg, #090d16)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 180,
                  maxHeight: 260,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {formImagePreview ? (
                    <div style={{
                      width: formData.position === 'LEFT' || formData.position === 'RIGHT' ? '180px' : '100%',
                      maxHeight: '180px',
                      height: formData.sizePreset === 'CUSTOM' ? `${Math.min(formData.heightValue, 160)}px` : 'auto',
                      borderRadius: 8,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: 6
                    }}>
                      <img
                        src={formImagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: formData.imageFit,
                          borderRadius: 6
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Upload an image file below to see live aspect-ratio &amp; sizing preview.
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 10,
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0,0,0,0.6)',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    Placement: <strong>{formData.position}</strong> • Sizing: <strong>{formData.width} × {formData.height}</strong> • Fit: <strong>{formData.imageFit}</strong> • Motion: <strong>{formData.motionType}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 5: FILE UPLOAD & SCHEDULE */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                  Ad Creative Image File (JPG, PNG, WebP) {editingAd ? '(Leave blank to retain existing)' : '*'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!editingAd && !formImagePreview}
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 8,
                    background: 'var(--bg-input, rgba(255,255,255,0.05))',
                    border: '1px dashed var(--border-color, rgba(255,255,255,0.2))',
                    color: 'var(--text-main, #ffffff)'
                  }}
                />
                {(formData.position === 'MOBILE_TOP' || formData.position === 'MOBILE_BOTTOM') && (
                  <div style={{
                    marginTop: '0.6rem',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '0.82rem',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    💡 <strong>Recommended Mobile Creative Size:</strong> 720×120px banner (aspect ratio ~6:1) for sharp retina display on mobile viewer screens.
                  </div>
                )}
                {formData.position.startsWith('STREAM_') && (
                  <div style={{
                    marginTop: '0.6rem',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    fontSize: '0.82rem',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    🎥 <strong>Live Stream Placement:</strong> Displays directly on/around the viewer stream player with instant WebSocket sync. Does not disturb, reload, or rebuffer video playback.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Sort Order / Priority</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>Start Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
              </div>

              {/* Target Devices Multi-Select */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>
                  Target Devices (Multi-Select)
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'MOBILE', label: '📱 Mobile Live Match Viewer' },
                    { id: 'TV', label: '📺 Smart TV Display' },
                    { id: 'SIGNAGE', label: '🖥️ Digital Signage' }
                  ].map(dev => {
                    const isChecked = (formData.devices || []).includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          background: isChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isChecked ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: isChecked ? '#10b981' : 'var(--text-main, #fff)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormData(prev => {
                              const current = prev.devices || [];
                              const next = current.includes(dev.id)
                                ? current.filter(d => d !== dev.id)
                                : [...current, dev.id];
                              return { ...prev, devices: next.length > 0 ? next : [dev.id] };
                            });
                          }}
                        />
                        <span>{dev.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Venues and Target Tournaments (Side-by-side Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Assigned Venues */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={16} color="var(--accent-primary, #10b981)" />
                      Target Venues
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, venueIds: [] }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: formData.venueIds.length === 0 ? 'var(--accent-primary, #10b981)' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      All Venues (Global)
                    </button>
                  </div>

                  <div style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    maxHeight: 140,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={formData.venueIds.length === 0}
                          onChange={() => setFormData(prev => ({ ...prev, venueIds: [] }))}
                        />
                        <span>All Venues (Global Network)</span>
                      </label>
                    </div>
                    {venues.map(v => (
                      <div key={v.id} style={{ marginLeft: 16, marginBottom: 4 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formData.venueIds.includes(v.id)}
                            onChange={() => handleVenueToggle(v.id)}
                          />
                          <span>{v.name} ({v.city})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Tournaments */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Trophy size={16} color="#60a5fa" />
                      Target Tournaments
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tournamentIds: [] }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: (!formData.tournamentIds || formData.tournamentIds.length === 0) ? '#60a5fa' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      All Tournaments (Global)
                    </button>
                  </div>

                  {/* Search box for tournaments */}
                  <div style={{ marginBottom: 6, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search tournament by name..."
                      value={tournamentSearchQuery}
                      onChange={(e) => setTournamentSearchQuery(e.target.value)}
                      style={{
                        ...inputStyle,
                        width: '100%',
                        padding: '4px 8px 4px 26px',
                        fontSize: '0.8rem',
                        height: 28
                      }}
                    />
                    <Search size={13} style={{ position: 'absolute', left: 8, top: 7, color: '#94a3b8' }} />
                  </div>

                  <div style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    maxHeight: 104,
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={!formData.tournamentIds || formData.tournamentIds.length === 0}
                          onChange={() => setFormData(prev => ({ ...prev, tournamentIds: [] }))}
                        />
                        <span>All Tournaments (Global)</span>
                      </label>
                    </div>
                    {tournaments
                      .filter(t => !tournamentSearchQuery || t.name.toLowerCase().includes(tournamentSearchQuery.toLowerCase()))
                      .map(t => (
                        <div key={t.id} style={{ marginLeft: 16, marginBottom: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={formData.tournamentIds?.includes(t.id)}
                              onChange={() => handleTournamentToggle(t.id)}
                            />
                            <span>{t.name} {t.city ? `(${t.city})` : ''}</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ fontWeight: 800, padding: '0.7rem 1.75rem' }}
                >
                  {actionLoading
                    ? (editingAd ? 'Updating...' : 'Uploading...')
                    : (editingAd ? 'Save & Synchronize Ad' : 'Publish & Broadcast Ad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── IMAGE PREVIEW POPUP MODAL ── */}
      {previewModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ padding: '2rem', maxWidth: '85vw', maxHeight: '85vh', textAlign: 'center', borderRadius: 16 }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>{previewModal.title}</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Position: <strong>{previewModal.position}</strong> • Preset: <strong>{previewModal.sizePreset}</strong> • Dimensions: <strong>{previewModal.width} × {previewModal.height}</strong> • Fit: <strong>{previewModal.imageFit}</strong>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '1rem',
              maxHeight: '60vh',
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <img
                src={previewModal.imageUrl}
                alt={previewModal.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '52vh',
                  objectFit: previewModal.imageFit || 'contain',
                  borderRadius: 8
                }}
              />
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setPreviewModal(null)} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManagementPanel;
