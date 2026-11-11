'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from '../lib/routerCompat';
import API, { clearApiCache } from '../services/api';
import axios from 'axios';
import { updateUser, logout } from '../features/auth/authSlice';
import { compressAndOptimizeImage } from '../lib/imageOptimizer';
import {
  User, Mail, Phone, MapPin, Calendar, Shield, Trophy,
  Camera, Trash2, Edit3, CheckCircle2, AlertCircle, Lock,
  LogOut, Save, X, ExternalLink, Activity, Award, Flame,
  Check, Eye, EyeOff, LayoutDashboard, Building2, RefreshCw,
  Radio, Video, Zap, ClipboardList, Play
} from 'lucide-react';
import { socket } from '../services/socket';

export default function MyProfilePage() {
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const themeMode = useSelector((state) => state.theme?.mode) || 'dark';
  const isLight = themeMode === 'light';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Profile data from backend
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active sub-tab: 'details' | 'role_data' | 'assigned' | 'security'
  const [activeTab, setActiveTab] = useState('details');
  const [assignedFilter, setAssignedFilter] = useState('ALL'); // 'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED'

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Edit form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    dob: '',
    gender: 'Not Specified',
    city: '',
    state: '',
    country: 'India',
    address: '',
    postalCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    primarySportSlug: 'cricket',
    primaryPosition: '',
    jerseyNumber: '',
    battingStyle: '',
    bowlingStyle: '',
    preferredHandFoot: 'Right',
    experienceLevel: 'Club',
    skillCategory: 'Amateur'
  });

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Photo Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState(null);

  // Change Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Fetch full profile from authenticated endpoint with non-blocking cache
  const fetchProfile = async (silent = false) => {
    try {
      if (!silent && !profile) setLoading(true);
      setError(null);
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('turf_token') : null);
      if (!authToken) {
        navigate('/login');
        return;
      }

      const res = await API.get('/users/profile');

      if (res.data?.success && res.data.data) {
        const data = res.data.data;
        setProfile(data);
        setFormData({
          fullName: data.fullName || '',
          username: data.username || '',
          phone: data.phone || '',
          dob: data.dob ? String(data.dob).slice(0, 10) : '',
          gender: data.gender || 'Not Specified',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          address: data.address || '',
          postalCode: data.postalCode || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || '',
          primarySportSlug: data.primarySportSlug || 'cricket',
          primaryPosition: data.primaryPosition || '',
          jerseyNumber: data.jerseyNumber !== null && data.jerseyNumber !== undefined ? String(data.jerseyNumber) : '',
          battingStyle: data.battingStyle || '',
          bowlingStyle: data.bowlingStyle || '',
          preferredHandFoot: data.preferredHandFoot || 'Right',
          experienceLevel: data.experienceLevel || 'Club',
          skillCategory: data.skillCategory || 'Amateur'
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      if (err.response?.status === 401) {
        dispatch(logout());
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load user profile. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  // Real-time listener for Scorer and Live-streaming assignment changes
  useEffect(() => {
    if (!profile?.id) return;
    socket.emit('join:user', { userId: profile.id });

    const handleAssignmentUpdate = () => {
      fetchProfile();
    };

    socket.on('tournament:scorersUpdated', handleAssignmentUpdate);
    socket.on('scorer:assignmentChanged', handleAssignmentUpdate);
    socket.on('user:scorer_assignment_updated', handleAssignmentUpdate);
    socket.on('user:stream_permission_granted', handleAssignmentUpdate);
    socket.on('user:stream_permission_revoked', handleAssignmentUpdate);
    socket.on('stream:permissionsUpdated', handleAssignmentUpdate);

    const onFocus = () => fetchProfile();
    window.addEventListener('focus', onFocus);

    return () => {
      socket.off('tournament:scorersUpdated', handleAssignmentUpdate);
      socket.off('scorer:assignmentChanged', handleAssignmentUpdate);
      socket.off('user:scorer_assignment_updated', handleAssignmentUpdate);
      socket.off('user:stream_permission_granted', handleAssignmentUpdate);
      socket.off('user:stream_permission_revoked', handleAssignmentUpdate);
      socket.off('stream:permissionsUpdated', handleAssignmentUpdate);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile?.id]);

  // Debounced Username Check during edit
  useEffect(() => {
    if (!isEditing || !formData.username) return;
    const clean = formData.username.trim().toLowerCase();
    if (clean === profile?.username?.toLowerCase()) {
      setUsernameStatus({ valid: true, available: true, message: 'Current username' });
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus({ valid: false, message: 'Minimum 3 characters required' });
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus({ valid: false, message: 'Letters, numbers and underscores only' });
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const authToken = token || localStorage.getItem('turf_token');
        const res = await axios.get(`/api/users/check-username?username=${encodeURIComponent(clean)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (res.data?.success) {
          setUsernameStatus(res.data.data);
        }
      } catch (err) {
        setUsernameStatus({ valid: false, message: 'Error checking username' });
      } finally {
        setIsCheckingUsername(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.username, isEditing, profile?.username]);

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const authToken = token || localStorage.getItem('turf_token');
      const res = await axios.put('/api/users/profile', formData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (res.data?.success) {
        clearApiCache('/users/profile');
        setSaveSuccess('Profile updated successfully!');
        setProfile((prev) => ({ ...prev, ...res.data.data }));
        
        // Instantly sync Redux & LocalStorage
        dispatch(updateUser({
          fullName: res.data.data.fullName,
          username: res.data.data.username,
          phone: res.data.data.phone,
          profilePhoto: res.data.data.profilePhoto
        }));

        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess(null);
        }, 1200);
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Profile Photo Upload & Compression
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setPhotoMessage(null);

    try {
      // 1. Safely extract file to upload with client-side compression
      let fileToUpload = file;
      try {
        const optimized = await compressAndOptimizeImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.85
        });
        if (optimized?.file instanceof Blob) {
          fileToUpload = optimized.file;
        }
      } catch (compErr) {
        console.warn('Client-side compression skipped, uploading original file:', compErr);
        fileToUpload = file;
      }

      // 2. Build form data with actual File/Blob object
      const photoFormData = new FormData();
      const fileName = fileToUpload.name || (file.name ? file.name : 'avatar.webp');
      photoFormData.append('photo', fileToUpload, fileName);

      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('turf_token') || localStorage.getItem('token')) : null);
      const res = await axios.post('/api/users/profile-photo', photoFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });

      if (res.data?.success) {
        clearApiCache('/users/profile');
        const newPhotoUrl = res.data.data?.profilePhoto;
        setProfile((prev) => ({ ...prev, profilePhoto: newPhotoUrl }));
        dispatch(updateUser({ profilePhoto: newPhotoUrl, photoThumbnail: newPhotoUrl }));
        setPhotoMessage({ type: 'success', text: 'Photo updated successfully!' });
        setTimeout(() => setPhotoMessage(null), 3000);
      } else {
        setPhotoMessage({ type: 'error', text: res.data?.message || 'Failed to upload photo.' });
      }
    } catch (err) {
      setPhotoMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to upload photo.' });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    if (!confirm('Remove profile photo and restore default avatar?')) return;
    setIsUploadingPhoto(true);
    try {
      const authToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('turf_token') || localStorage.getItem('token')) : null);
      const res = await axios.delete('/api/users/profile-photo', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (res.data?.success) {
        clearApiCache('/users/profile');
        setProfile((prev) => ({ ...prev, profilePhoto: null }));
        dispatch(updateUser({ profilePhoto: null, photoThumbnail: null }));
        setPhotoMessage({ type: 'success', text: 'Photo removed.' });
        setTimeout(() => setPhotoMessage(null), 3000);
      } else {
        setPhotoMessage({ type: 'error', text: res.data?.message || 'Failed to remove photo.' });
      }
    } catch (err) {
      setPhotoMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to remove photo.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setPasswordError('Please fill in both current and new passwords.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    try {
      const authToken = token || localStorage.getItem('turf_token');
      const res = await axios.post('/api/users/change-password', passwordData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data?.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(null), 4000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      dispatch(logout());
      navigate('/login');
    }
  };

  // Helpers
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const userRole = (profile?.role || user?.role || 'PLAYER').toUpperCase();

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: isLight ? '#64748b' : '#94a3b8' }}>
        <RefreshCw size={36} className="animate-spin" color="#10b981" />
        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading your profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: '450px', textAlign: 'center', background: isLight ? '#ffffff' : '#0f172a', padding: '2rem', borderRadius: '16px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}` }}>
          <AlertCircle size={40} color="#f87171" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Could Not Load Profile</h2>
          <p style={{ color: isLight ? '#64748b' : '#94a3b8', fontSize: '0.88rem', marginBottom: '1.25rem' }}>{error}</p>
          <button onClick={fetchProfile} className="btn btn-primary btn-sm">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="profile-page-root"
      style={{
        width: '100%',
        maxWidth: '1100px',
        minWidth: 0,
        margin: '0 auto',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        padding: 'clamp(0.75rem, 2.5vw, 1.75rem) clamp(0.65rem, 2vw, 1.25rem)'
      }}
    >

      {/* Scoped Responsive Styles */}
      <style>{`
        .profile-page-root {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .profile-hero-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .profile-banner-graphic {
          height: clamp(95px, 16vw, 130px);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.35) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(139, 92, 246, 0.35) 100%);
          position: relative;
        }
        .profile-hero-body {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 0 clamp(0.85rem, 3vw, 1.5rem) clamp(1rem, 2.5vw, 1.35rem);
          margin-top: clamp(-44px, -8vw, -52px);
        }
        .profile-avatar-box {
          width: 100%;
          height: 100%;
          border-radius: clamp(16px, 4.5vw, 22px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 900;
          font-size: clamp(1.6rem, 4vw, 2.2rem);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
          box-sizing: border-box;
        }
        .profile-user-name {
          font-size: clamp(1.2rem, 4.2vw, 1.7rem);
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1.25;
          word-break: break-word;
          overflow-wrap: anywhere;
          min-width: 0;
          max-width: 100%;
        }

        /* Mobile (< 641px): Top bar has avatar left, actions right; Identity details below */
        @media (max-width: 640px) {
          .profile-hero-layout {
            display: flex;
            flex-direction: column;
            width: 100%;
            min-width: 0;
          }
          .profile-hero-top-bar {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            width: 100%;
            min-width: 0;
            margin-bottom: 0.65rem;
          }
          .profile-avatar-slot {
            position: relative;
            width: clamp(76px, 20vw, 92px);
            height: clamp(76px, 20vw, 92px);
            flex-shrink: 0;
          }
          .profile-actions-slot {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            justify-content: flex-end;
            align-self: flex-end;
            margin-bottom: 2px;
            flex-wrap: wrap;
            min-width: 0;
            z-index: 5;
          }
          .profile-info-slot {
            width: 100%;
            min-width: 0;
          }
          .profile-tabs-strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          .profile-tab-button {
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 0.75rem 0.2rem;
            gap: 0.25rem;
            min-width: 0;
            width: 100%;
            transition: all 0.15s ease;
            box-sizing: border-box;
          }
          .profile-tab-label-short {
            display: block;
            font-size: clamp(0.68rem, 2.2vw, 0.74rem);
            font-weight: 700;
            line-height: 1.15;
            text-align: center;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 100%;
          }
          .profile-tab-label-full {
            display: none;
          }
        }

        /* Desktop (≥ 641px): Ordered side-by-side flex */
        @media (min-width: 641px) {
          .profile-hero-layout {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 1.25rem;
            width: 100%;
            min-width: 0;
          }
          .profile-hero-top-bar {
            display: contents;
          }
          .profile-avatar-slot {
            order: 1;
            width: 100px;
            height: 100px;
            flex-shrink: 0;
            position: relative;
          }
          .profile-info-slot {
            order: 2;
            flex: 1;
            min-width: 0;
            margin-bottom: 0.25rem;
          }
          .profile-actions-slot {
            order: 3;
            margin-left: auto;
            margin-bottom: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          .profile-tabs-strip {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 0.25rem;
            padding: 0 clamp(0.75rem, 2vw, 1.25rem);
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          .profile-tab-button {
            border: none;
            background: transparent;
            cursor: pointer;
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
            padding: 0.85rem clamp(0.75rem, 1.8vw, 1.25rem);
            transition: all 0.15s ease;
            box-sizing: border-box;
          }
          .profile-tab-label-short {
            display: none;
          }
          .profile-tab-label-full {
            display: inline;
            font-size: 0.88rem;
            font-weight: 700;
            white-space: nowrap;
          }
        }

        .profile-two-col-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(1rem, 2.5vw, 1.5rem);
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        @media (min-width: 768px) {
          .profile-two-col-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

      {/* ──────────────── Top Hero Profile Card ──────────────── */}
      <div
        className="profile-hero-card"
        style={{
          background: isLight ? '#ffffff' : '#0f172a',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: isLight ? '0 4px 20px rgba(0,0,0,0.04)' : '0 10px 30px rgba(0,0,0,0.35)'
        }}
      >
        {/* Banner Graphic Header */}
        <div className="profile-banner-graphic" />

        {/* Profile Content Bar */}
        <div className="profile-hero-body">
          <div className="profile-hero-layout">

            {/* Avatar & Action Slot (Top bar on mobile, separated on desktop) */}
            <div className="profile-hero-top-bar">
              {/* Avatar with Camera Trigger */}
              <div className="profile-avatar-slot">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
                <div
                  className="profile-avatar-box"
                  style={{
                    border: `4px solid ${isLight ? '#ffffff' : '#0f172a'}`,
                    background: profile.profilePhoto
                      ? `url(${profile.profilePhoto}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  }}
                >
                  {!profile.profilePhoto && initials}
                </div>

                {/* Upload Photo Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  style={{
                    position: 'absolute',
                    bottom: -3,
                    right: -3,
                    background: '#10b981',
                    color: '#ffffff',
                    border: `2px solid ${isLight ? '#ffffff' : '#0f172a'}`,
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    transition: 'transform 0.15s ease'
                  }}
                  title="Upload profile photo"
                  aria-label="Upload profile photo"
                >
                  {isUploadingPhoto ? <RefreshCw size={13} className="animate-spin" /> : <Camera size={14} />}
                </button>
              </div>

              {/* Quick Actions Header Buttons */}
              <div className="profile-actions-slot">
                {profile.profilePhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#f87171', border: `1px solid ${isLight ? '#fca5a5' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '10px', padding: '0.45rem 0.65rem' }}
                    title="Remove photo"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`btn btn-sm ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px', fontWeight: 700, padding: '0.45rem 0.85rem' }}
                >
                  {isEditing ? <X size={15} /> : <Edit3 size={15} />}
                  <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: '10px', color: '#f87171', padding: '0.45rem 0.65rem' }}
                  title="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>

            {/* Name, Badges & Metadata */}
            <div className="profile-info-slot">
              {/* Full Name on its own line */}
              <h1 className="profile-user-name" style={{ color: isLight ? '#0f172a' : '#ffffff' }}>
                {profile.fullName}
              </h1>

              {/* Badges line with graceful wrapping */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    background: userRole.includes('ADMIN')
                      ? 'rgba(245, 158, 11, 0.18)'
                      : userRole === 'VENUE_OWNER'
                      ? 'rgba(59, 130, 246, 0.18)'
                      : 'rgba(16, 185, 129, 0.18)',
                    color: userRole.includes('ADMIN')
                      ? '#f59e0b'
                      : userRole === 'VENUE_OWNER'
                      ? '#3b82f6'
                      : '#10b981',
                    border: '1px solid currentColor'
                  }}
                >
                  {userRole}
                </span>

                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                  ● {profile.status || 'ACTIVE'}
                </span>
              </div>

              {/* Metadata row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.35rem', color: isLight ? '#64748b' : '#94a3b8', fontSize: '0.82rem' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>@{profile.username}</span>
                {profile.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={13} color="#10b981" /> {profile.city}{profile.country ? `, ${profile.country}` : ''}
                  </span>
                )}
                {profile.memberSince && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={13} /> Joined {new Date(profile.memberSince).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Photo feedback notification */}
          {photoMessage && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: photoMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: photoMessage.type === 'success' ? '#10b981' : '#f87171',
                border: `1px solid ${photoMessage.type === 'success' ? '#10b981' : '#f87171'}`
              }}
            >
              {photoMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{photoMessage.text}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs Header - Ultra-responsive grid on Mobile, Flex on Desktop */}
        <div
          className="profile-tabs-strip"
          style={{
            borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
            background: isLight ? '#f8fafc' : '#111827'
          }}
        >
          {/* Tab 1: Personal & Contact */}
          <button
            onClick={() => { setActiveTab('details'); setIsEditing(false); }}
            className="profile-tab-button"
            style={{
              borderBottom: activeTab === 'details' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'details' ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
              fontWeight: activeTab === 'details' ? 800 : 600
            }}
          >
            <User size={16} />
            <span className="profile-tab-label-short">Personal &amp; Contact</span>
            <span className="profile-tab-label-full">Personal &amp; Contact</span>
          </button>

          {/* Tab 2: Role Specific Tab */}
          <button
            onClick={() => { setActiveTab('role_data'); setIsEditing(false); }}
            className="profile-tab-button"
            style={{
              borderBottom: activeTab === 'role_data' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'role_data' ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
              fontWeight: activeTab === 'role_data' ? 800 : 600
            }}
          >
            {userRole === 'VENUE_OWNER' ? <Building2 size={16} /> : <Trophy size={16} />}
            <span className="profile-tab-label-short">{userRole === 'VENUE_OWNER' ? 'My Venues' : userRole.includes('ADMIN') ? 'Admin' : 'Career & Teams'}</span>
            <span className="profile-tab-label-full">{userRole === 'VENUE_OWNER' ? 'My Venues & Turfs' : userRole.includes('ADMIN') ? 'Administration' : 'Sports Career & Teams'}</span>
          </button>

          {/* Tab 3: Assigned Matches Tab */}
          <button
            onClick={() => { setActiveTab('assigned'); setIsEditing(false); }}
            className="profile-tab-button"
            style={{
              borderBottom: activeTab === 'assigned' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'assigned' ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
              fontWeight: activeTab === 'assigned' ? 800 : 600
            }}
          >
            <ClipboardList size={16} />
            <span className="profile-tab-label-short">
              Assigned {Boolean(profile?.assignedMatches?.length > 0) && `(${profile.assignedMatches.length})`}
            </span>
            <span className="profile-tab-label-full">
              Assigned Matches
              {Boolean(profile?.assignedMatches?.length > 0) && (
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '0.35rem'
                }}>
                  {profile.assignedMatches.length}
                </span>
              )}
            </span>
          </button>

          {/* Tab 4: Security & Account */}
          <button
            onClick={() => { setActiveTab('security'); setIsEditing(false); }}
            className="profile-tab-button"
            style={{
              borderBottom: activeTab === 'security' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'security' ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'),
              fontWeight: activeTab === 'security' ? 800 : 600
            }}
          >
            <Lock size={16} />
            <span className="profile-tab-label-short">Security</span>
            <span className="profile-tab-label-full">Security &amp; Account</span>
          </button>
        </div>
      </div>

      {/* ──────────────── Main Tab Content ──────────────── */}

      {/* 1. PERSONAL & CONTACT TAB */}
      {activeTab === 'details' && (
        isEditing ? (
          /* ── Edit Profile Form ── */
          <form
            onSubmit={handleSaveProfile}
            style={{
              background: isLight ? '#ffffff' : '#0f172a',
              borderRadius: '20px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              padding: '1.75rem',
              boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.03)' : '0 10px 30px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`, paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff' }}>
                  Edit Profile Information
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-ghost btn-sm"
                style={{ color: isLight ? '#64748b' : '#94a3b8' }}
              >
                Cancel
              </button>
            </div>

            {/* Notifications */}
            {saveSuccess && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', marginBottom: '1.25rem', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} /> {saveSuccess}
              </div>
            )}
            {saveError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid #f87171', marginBottom: '1.25rem', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} /> {saveError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Username *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                  />
                  {isCheckingUsername && (
                    <RefreshCw size={14} className="animate-spin" style={{ position: 'absolute', right: 12, top: 14, color: '#10b981' }} />
                  )}
                </div>
                {usernameStatus && (
                  <span style={{ fontSize: '0.74rem', marginTop: '4px', display: 'block', color: usernameStatus.available ? '#10b981' : '#f87171' }}>
                    {usernameStatus.available ? '✓ Username available' : `✕ ${usernameStatus.message || 'Unavailable'}`}
                  </span>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Not Specified">Prefer not to say</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Bengaluru"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* State */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  State / Province
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra, Karnataka"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* Country */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Address & Emergency Contact Section */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.85rem', color: isLight ? '#0f172a' : '#ffffff' }}>
              Address &amp; Emergency Contact
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street address, apartment or flat number"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  placeholder="Guardian / Family contact name"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91..."
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* If Player, show sports attributes */}
            {userRole === 'PLAYER' && (
              <>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.85rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                  Playing &amp; Athletic Preferences
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Primary Sport
                    </label>
                    <select
                      value={formData.primarySportSlug}
                      onChange={(e) => setFormData({ ...formData, primarySportSlug: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    >
                      <option value="cricket">Cricket</option>
                      <option value="football">Football</option>
                      <option value="badminton">Badminton</option>
                      <option value="pickleball">Pickleball</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Primary Playing Position
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Forward, All-Rounder, Singles"
                      value={formData.primaryPosition}
                      onChange={(e) => setFormData({ ...formData, primaryPosition: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Jersey Number
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 7, 10, 18"
                      value={formData.jerseyNumber}
                      onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Batting Style
                    </label>
                    <input
                      type="text"
                      placeholder="Right-hand bat / Left-hand bat"
                      value={formData.battingStyle}
                      onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Bowling Style
                    </label>
                    <input
                      type="text"
                      placeholder="Right-arm fast / Spin"
                      value={formData.bowlingStyle}
                      onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                      Experience Level
                    </label>
                    <select
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                    >
                      <option value="Recreational">Recreational</option>
                      <option value="Club">Club Level</option>
                      <option value="State">State / Regional</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`, paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem', borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', borderRadius: '10px', fontWeight: 700 }}
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── View Profile Cards ── */
          <div className="profile-two-col-grid">
            {/* Contact & Identity Details Card */}
            <div
              style={{
                background: isLight ? '#ffffff' : '#0f172a',
                borderRadius: '20px',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                padding: 'clamp(1.15rem, 3vw, 1.6rem)',
                boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.03)' : '0 10px 30px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={18} color="#10b981" />
                  <span>Account &amp; Contact</span>
                </h3>
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-xs" style={{ color: '#10b981', fontWeight: 700 }}>
                  Edit
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Full Name</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px' }}>
                    {profile.fullName}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Email Address</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={14} color="#10b981" />
                    <span>{profile.email}</span>
                    <span style={{ fontSize: '0.66rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      Verified
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Mobile Number</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="#10b981" />
                    <span>{profile.phone || 'Not added yet'}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Date of Birth &amp; Gender</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px' }}>
                    {profile.dob ? `${new Date(profile.dob).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} (${profile.age} yrs)` : 'Not specified'} • {profile.gender}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Location</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="#10b981" />
                    <span>{[profile.city, profile.state, profile.country].filter(Boolean).join(', ') || 'Not specified'}</span>
                  </div>
                </div>

                {profile.address && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Address</span>
                    <div style={{ fontSize: '0.88rem', color: isLight ? '#334155' : '#cbd5e1', marginTop: '2px' }}>
                      {profile.address} {profile.postalCode ? `- ${profile.postalCode}` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact & Safety Card */}
            <div
              style={{
                background: isLight ? '#ffffff' : '#0f172a',
                borderRadius: '20px',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                padding: 'clamp(1.15rem, 3vw, 1.6rem)',
                boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.03)' : '0 10px 30px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="#f59e0b" />
                  <span>Emergency &amp; Safety Contact</span>
                </h3>
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-xs" style={{ color: '#10b981', fontWeight: 700 }}>
                  Edit
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Contact Person Name</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px' }}>
                    {profile.emergencyContactName || 'No emergency contact registered'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Contact Phone Number</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: isLight ? '#0f172a' : '#f8fafc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={14} color="#f59e0b" />
                    <span>{profile.emergencyContactPhone || 'Not specified'}</span>
                  </div>
                </div>

                <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isLight ? '#334155' : '#f8fafc', marginBottom: '0.35rem' }}>
                    🔒 Privacy &amp; Data Security
                  </div>
                  <div style={{ fontSize: '0.74rem', color: isLight ? '#64748b' : '#94a3b8', lineHeight: 1.5 }}>
                    Your private contact and emergency details are only visible to you and tournament officials in case of medical necessity. They are never shared publicly.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* 2. ROLE-SPECIFIC TAB */}
      {activeTab === 'role_data' && (
        <div>
          {/* PLAYER VIEW */}
          {userRole === 'PLAYER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Playing Profile Summary Card */}
              <div
                style={{
                  background: isLight ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy size={18} color="#10b981" />
                    <span>Sports Playing Attributes</span>
                  </h3>
                  <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-xs" style={{ color: '#10b981', fontWeight: 700 }}>
                    Edit Sports Data
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.85rem' }}>
                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Primary Sport</span>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10b981', textTransform: 'capitalize', marginTop: '2px' }}>
                      {profile.primarySportSlug || 'Cricket'}
                    </div>
                  </div>

                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Position / Role</span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                      {profile.primaryPosition || 'All-Rounder'}
                    </div>
                  </div>

                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Jersey Number</span>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>
                      #{profile.jerseyNumber || 'N/A'}
                    </div>
                  </div>

                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Batting / Bowling</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                      {profile.battingStyle || 'Right-hand'} • {profile.bowlingStyle || 'Right-arm'}
                    </div>
                  </div>

                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Skill &amp; Experience</span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                      {profile.skillCategory || 'Amateur'} ({profile.experienceLevel || 'Club'})
                    </div>
                  </div>
                </div>
              </div>

              {/* Career Stats Grid */}
              <div
                style={{
                  background: isLight ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.5rem'
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} color="#3b82f6" />
                  <span>Dynamic Career Statistics</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.85rem' }}>
                  {/* Cricket */}
                  <div style={{ border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#10b981', marginBottom: '0.5rem' }}>🏏 Cricket</div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Matches: <strong>{profile.careerStats?.cricket?.matchesPlayed || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Runs: <strong>{profile.careerStats?.cricket?.batting?.runs || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Wickets: <strong>{profile.careerStats?.cricket?.bowling?.wickets || 0}</strong></div>
                  </div>

                  {/* Football */}
                  <div style={{ border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#3b82f6', marginBottom: '0.5rem' }}>⚽ Football</div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Matches: <strong>{profile.careerStats?.football?.matchesPlayed || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Goals: <strong>{profile.careerStats?.football?.goals || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Assists: <strong>{profile.careerStats?.football?.assists || 0}</strong></div>
                  </div>

                  {/* Badminton */}
                  <div style={{ border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#8b5cf6', marginBottom: '0.5rem' }}>🏸 Badminton</div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Matches: <strong>{profile.careerStats?.badminton?.matchesPlayed || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Won: <strong>{profile.careerStats?.badminton?.won || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Win Rate: <strong>{profile.careerStats?.badminton?.winPercentage || '0%'}</strong></div>
                  </div>

                  {/* Pickleball */}
                  <div style={{ border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f59e0b', marginBottom: '0.5rem' }}>🏓 Pickleball</div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Matches: <strong>{profile.careerStats?.pickleball?.matchesPlayed || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Won: <strong>{profile.careerStats?.pickleball?.won || 0}</strong></div>
                    <div style={{ fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>Win Rate: <strong>{profile.careerStats?.pickleball?.winPercentage || '0%'}</strong></div>
                  </div>
                </div>
              </div>

              {/* Registered Teams */}
              <div
                style={{
                  background: isLight ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.5rem'
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={18} color="#10b981" />
                  <span>My Teams ({profile.teams?.length || 0})</span>
                </h3>

                {(!profile.teams || profile.teams.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                    You have not joined any sports teams yet. Explore <Link to="/teams" style={{ color: '#10b981', fontWeight: 700 }}>Teams Hub</Link> to join or form a squad!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.85rem' }}>
                    {profile.teams.map((tm) => (
                      <Link
                        key={tm.id}
                        to={`/teams/${tm.id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.85rem',
                          borderRadius: '12px',
                          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                          background: isLight ? '#f8fafc' : '#1e293b'
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>
                          {tm.name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isLight ? '#0f172a' : '#ffffff' }}>{tm.name}</div>
                          <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8' }}>Role: {tm.role || 'Player'}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Tournament Awards */}
              {profile.awardsWon && profile.awardsWon.length > 0 && (
                <div
                  style={{
                    background: isLight ? '#ffffff' : '#0f172a',
                    borderRadius: '20px',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    padding: '1.5rem'
                  }}
                >
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={18} color="#f59e0b" />
                    <span>Verified Tournament Honours &amp; Awards ({profile.awardsWon.length})</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {profile.awardsWon.map((aw) => (
                      <div
                        key={aw.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          background: 'rgba(245, 158, 11, 0.05)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem'
                        }}
                      >
                        <Award size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.92rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                            {aw.award_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, margin: '2px 0' }}>
                            {aw.stat_value}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                            {aw.tournament_name}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TURF / VENUE OWNER VIEW */}
          {userRole === 'VENUE_OWNER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  background: isLight ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={18} color="#3b82f6" />
                    <span>Owned Sports Venues &amp; Turfs ({profile.totalVenuesCount || 0})</span>
                  </h3>
                  <Link to="/owner/dashboard" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}>
                    <LayoutDashboard size={14} />
                    <span>Owner Dashboard</span>
                  </Link>
                </div>

                {(!profile.venuesOwned || profile.venuesOwned.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                    No venues registered under your account yet. Visit the <Link to="/owner/dashboard" style={{ color: '#3b82f6', fontWeight: 700 }}>Owner Dashboard</Link> to add your first venue!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {profile.venuesOwned.map((vn) => (
                      <div
                        key={vn.id}
                        style={{
                          padding: '1.15rem',
                          borderRadius: '14px',
                          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                          background: isLight ? '#f8fafc' : '#1e293b'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                            {vn.name}
                          </h4>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: (vn.status === 'APPROVED' || vn.is_active) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: (vn.status === 'APPROVED' || vn.is_active) ? '#10b981' : '#f87171' }}>
                            {(vn.status === 'APPROVED' || vn.is_active) ? 'ACTIVE' : (vn.status || 'INACTIVE')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: isLight ? '#64748b' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.65rem' }}>
                          <MapPin size={13} color="#10b981" />
                          <span>{vn.address}, {vn.city}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, paddingTop: '0.65rem', fontSize: '0.76rem' }}>
                          <span>Courts: <strong style={{ color: '#10b981' }}>{vn.court_count || 0}</strong></span>
                          <span>Bookings: <strong style={{ color: '#3b82f6' }}>{vn.booking_count || 0}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADMIN / SUPER_ADMIN VIEW */}
          {userRole.includes('ADMIN') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  background: isLight ? '#ffffff' : '#0f172a',
                  borderRadius: '20px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={18} color="#f59e0b" />
                    <span>Administrative Management Hub</span>
                  </h3>
                  <Link to="/admin/dashboard" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}>
                    <LayoutDashboard size={14} />
                    <span>Admin Portal</span>
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Access Privilege</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>{userRole}</div>
                  </div>
                  <div style={{ background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: isLight ? '#64748b' : '#94a3b8' }}>Platform Operations</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                      Full Tournament, Match &amp; Signage Oversight
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SECURITY & PASSWORD TAB */}
      {activeTab === 'security' && (
        <div className="profile-two-col-grid">
          {/* Password Change Card */}
          <div
            style={{
              background: isLight ? '#ffffff' : '#0f172a',
              borderRadius: '20px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              padding: 'clamp(1.15rem, 3vw, 1.6rem)',
              boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.03)' : '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Lock size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff' }}>
                Change Password
              </h3>
            </div>

            {passwordSuccess && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', marginBottom: '1rem', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid #f87171', marginBottom: '1rem', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Current Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', paddingRight: '2.5rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    style={{ position: 'absolute', right: 10, top: 11, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  New Password (min 6 characters) *
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: isLight ? '#334155' : '#cbd5e1' }}>
                  Confirm New Password *
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`, background: isLight ? '#f8fafc' : '#1e293b', color: isLight ? '#0f172a' : '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isChangingPassword ? <RefreshCw size={16} className="animate-spin" /> : <Lock size={16} />}
                <span>{isChangingPassword ? 'Verifying & Updating...' : 'Update Password'}</span>
              </button>
            </form>
          </div>

          {/* Account Security Information */}
          <div
            style={{
              background: isLight ? '#ffffff' : '#0f172a',
              borderRadius: '20px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              padding: 'clamp(1.15rem, 3vw, 1.6rem)',
              boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.03)' : '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1.25rem', color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="#3b82f6" />
              <span>Session &amp; Security Status</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Account Status</span>
                <div style={{ fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ● {profile.status || 'ACTIVE'} (Authorized)
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Account ID</span>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                  USR-{String(profile.id).padStart(6, '0')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Member Registration Date</span>
                <div style={{ fontWeight: 600, color: isLight ? '#0f172a' : '#ffffff', marginTop: '2px' }}>
                  {profile.memberSince ? new Date(profile.memberSince).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`, paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Account Actions</span>
                <div style={{ marginTop: '0.65rem' }}>
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}
                  >
                    <LogOut size={16} />
                    <span>Log Out of Current Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── 4. ASSIGNED MATCHES TAB (SCORING & STREAMING) ──────────────── */}
      {activeTab === 'assigned' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Filter Pills */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: isLight ? '#ffffff' : '#1e293b',
              padding: 'clamp(1rem, 2.5vw, 1.25rem) clamp(1rem, 3vw, 1.5rem)',
              borderRadius: '16px',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ClipboardList size={20} color="#10b981" />
                <span>Assigned Match Duties</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                Official scorer and live streaming assignments across tournaments
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All', count: (profile?.assignedMatches || []).length },
                { key: 'LIVE', label: 'Live', count: (profile?.assignedMatches || []).filter(m => m.status === 'LIVE' || m.status === 'IN_PROGRESS').length },
                { key: 'SCHEDULED', label: 'Upcoming', count: (profile?.assignedMatches || []).filter(m => m.status === 'SCHEDULED' || m.status === 'UPCOMING').length },
                { key: 'COMPLETED', label: 'Completed', count: (profile?.assignedMatches || []).filter(m => m.status === 'COMPLETED' || m.status === 'FINISHED').length }
              ].map(f => {
                const active = assignedFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAssignedFilter(f.key)}
                    style={{
                      padding: '0.42rem 0.9rem',
                      borderRadius: '20px',
                      border: active ? '1px solid #10b981' : `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? '#10b981' : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'),
                      color: active ? '#ffffff' : (isLight ? '#475569' : '#cbd5e1'),
                      fontWeight: active ? 800 : 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{f.label}</span>
                    <span style={{
                      background: active ? 'rgba(255,255,255,0.25)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'),
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Matches List or Empty State */}
          {(() => {
            const allAssigned = profile?.assignedMatches || [];
            const filtered = allAssigned.filter(m => {
              if (assignedFilter === 'LIVE') return m.status === 'LIVE' || m.status === 'IN_PROGRESS';
              if (assignedFilter === 'SCHEDULED') return m.status === 'SCHEDULED' || m.status === 'UPCOMING';
              if (assignedFilter === 'COMPLETED') return m.status === 'COMPLETED' || m.status === 'FINISHED';
              return true;
            });

            if (allAssigned.length === 0) {
              return (
                <div
                  style={{
                    background: isLight ? '#ffffff' : '#1e293b',
                    borderRadius: '16px',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    padding: '4rem 1.5rem',
                    textAlign: 'center',
                    maxWidth: 580,
                    margin: '1.5rem auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                  }}
                >
                  <ClipboardList size={52} color={isLight ? '#94a3b8' : '#64748b'} style={{ margin: '0 auto 1.25rem auto' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.6rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                    No Matches Currently Assigned
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: isLight ? '#64748b' : '#94a3b8', lineHeight: 1.6 }}>
                    No matches are currently assigned to you for scoring or live streaming. When a tournament organizer assigns you to score a match or broadcast a live stream, your duties and quick console links will appear here automatically.
                  </p>
                </div>
              );
            }

            if (filtered.length === 0) {
              return (
                <div
                  style={{
                    background: isLight ? '#ffffff' : '#1e293b',
                    borderRadius: '16px',
                    border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    color: isLight ? '#64748b' : '#94a3b8'
                  }}
                >
                  <AlertCircle size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    No {assignedFilter.toLowerCase()} assigned matches found.
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignedFilter('ALL')}
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '1rem', borderRadius: 8, fontSize: '0.8rem' }}
                  >
                    View All Assigned Matches ({allAssigned.length})
                  </button>
                </div>
              );
            }

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                  gap: '1.25rem'
                }}
              >
                {filtered.map(match => {
                  const isLive = match.status === 'LIVE' || match.status === 'IN_PROGRESS';
                  const isCompleted = match.status === 'COMPLETED' || match.status === 'FINISHED';
                  const matchId = match.uuid || match.id;
                  const sportSlug = String(match.sport_slug || '').toLowerCase();
                  const isPickleball = sportSlug === 'pickleball';
                  const hasScorerRole = match.roles?.includes('Scorer');
                  const hasStreamRole = match.roles?.includes('Live Streaming');

                  const scorerUrl = isPickleball
                    ? `/matches/${matchId}/pickleball-scorer`
                    : `/matches/${matchId}/scorer`;

                  const streamUrl = `/matches/${matchId}?stream=1`;
                  const publicUrl = `/matches/${matchId}/live`;

                  return (
                    <div
                      key={match.id}
                      style={{
                        background: isLight ? '#ffffff' : '#1e293b',
                        borderRadius: '16px',
                        border: isLive
                          ? '2px solid rgba(239, 68, 68, 0.45)'
                          : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                        padding: '1.25rem',
                        boxShadow: isLive ? '0 8px 24px rgba(239, 68, 68, 0.15)' : '0 4px 14px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      {/* Top Bar: Tournament & Status */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.65rem' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Trophy size={13} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {match.tournament_name || 'Tournament'}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '3px 0 0', color: isLight ? '#0f172a' : '#ffffff' }}>
                              Match #{match.match_number || match.id}
                            </h4>
                          </div>

                          {/* Status Badge */}
                          {isLive ? (
                            <span style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '20px',
                              padding: '2px 9px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              flexShrink: 0
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                              LIVE
                            </span>
                          ) : isCompleted ? (
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '20px',
                              padding: '2px 9px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              Completed
                            </span>
                          ) : (
                            <span style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              borderRadius: '20px',
                              padding: '2px 9px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Match Competitors */}
                        <div
                          style={{
                            background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)'}`,
                            marginBottom: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: '0.92rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {match.team_a_name || 'Team A'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0.5rem', fontWeight: 600 }}>vs</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'right' }}>
                              {match.team_b_name || 'Team B'}
                            </span>
                          </div>
                        </div>

                        {/* Date, Time & Venue */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Calendar size={13} color="#10b981" />
                            <span>{match.match_date || 'Date TBA'}{match.start_time ? ` at ${match.start_time}` : ''}</span>
                          </div>
                          {(match.venue_name || match.court_name) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <MapPin size={13} color="#3b82f6" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {match.venue_name || 'Venue'}{match.court_name ? ` • ${match.court_name}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Assigned Role Chips */}
                        <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          {hasScorerRole && (
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Zap size={12} /> Official Scorer
                            </span>
                          )}
                          {hasStreamRole && (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Video size={12} /> Live Streaming
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action CTA Buttons */}
                      <div
                        style={{
                          borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`,
                          paddingTop: '0.75rem',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {hasScorerRole && (
                          <Link
                            to={scorerUrl}
                            className="btn btn-sm"
                            style={{
                              flex: '1 1 120px',
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              textDecoration: 'none',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                            }}
                          >
                            <Zap size={14} /> Open Scorer
                          </Link>
                        )}

                        {hasStreamRole && (
                          <Link
                            to={streamUrl}
                            className="btn btn-sm"
                            style={{
                              flex: '1 1 140px',
                              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              textDecoration: 'none',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                            }}
                          >
                            <Video size={14} /> Start / Open Stream
                          </Link>
                        )}

                        <Link
                          to={publicUrl}
                          className="btn btn-outline btn-sm"
                          style={{
                            flex: '1 1 100px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            textDecoration: 'none'
                          }}
                        >
                          <Radio size={14} /> Public Score
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
