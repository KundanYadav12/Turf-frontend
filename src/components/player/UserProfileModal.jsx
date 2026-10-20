'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { updateUser, logout } from '../../features/auth/authSlice';
import { compressAndOptimizeImage } from '../../lib/imageOptimizer';
import {
  User, Camera, Trash2, CheckCircle2, AlertCircle, X,
  Upload, Sparkles, Loader2, AtSign, Shield, Phone, Mail
} from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [photoThumbnail, setPhotoThumbnail] = useState('');

  // Upload & preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: bool, message: string, suggestions: [] }
  const [usernameError, setUsernameError] = useState('');

  // Form saving state
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Populate initial values
  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setPhone(user.phone || '');
      setProfilePhoto(user.profilePhoto || '');
      setPhotoThumbnail(user.photoThumbnail || '');
      setPreviewUrl(null);
      setSelectedFile(null);
      setUsernameStatus(null);
      setUsernameError('');
      setFeedback(null);
    }
  }, [user, isOpen]);

  // Debounced username availability checker
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = username.trim().toLowerCase();
    
    // If it's already the user's current username, it's valid
    if (trimmed === user?.username?.toLowerCase()) {
      setUsernameStatus({ available: true, message: 'Current username' });
      setUsernameError('');
      return;
    }

    if (trimmed.length < 3) {
      setUsernameStatus(null);
      setUsernameError(trimmed.length > 0 ? 'Username must be at least 3 characters' : '');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus(null);
      setUsernameError('Only letters, numbers, and underscores are allowed');
      return;
    }

    setUsernameError('');
    setIsCheckingUsername(true);

    const timer = setTimeout(async () => {
      try {
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`/api/users/check-username?username=${encodeURIComponent(trimmed)}`, config);
        if (res.data.success) {
          setUsernameStatus(res.data.data);
        }
      } catch (err) {
        setUsernameStatus(null);
        setUsernameError(err?.response?.data?.message || 'Error checking availability');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user?.username, token, isOpen]);

  // Handle local image selection and client-side optimization
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFeedback(null);
      // Client-side compression to WebP max 512x512
      const optimized = await compressAndOptimizeImage(file, 512, 512, 0.85);
      setSelectedFile(optimized.file);
      setPreviewUrl(optimized.previewUrl);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to process image' });
    }
  };

  // Upload photo to backend
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploadingPhoto(true);
    setUploadProgress(10);
    setFeedback(null);

    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const res = await axios.post('/api/users/profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.data.success) {
        const { profilePhoto: newPhoto, photoThumbnail: newThumb } = res.data.data;
        setProfilePhoto(newPhoto);
        setPhotoThumbnail(newThumb);
        setPreviewUrl(null);
        setSelectedFile(null);
        dispatch(updateUser({ profilePhoto: newPhoto, photoThumbnail: newThumb }));
        setFeedback({ type: 'success', text: 'Profile photo updated and optimized!' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.message || 'Photo upload failed' });
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    if (!confirm('Remove your profile photo and revert to standard avatar?')) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await axios.delete('/api/users/profile-photo', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data.success) {
        setProfilePhoto(null);
        setPhotoThumbnail(null);
        setPreviewUrl(null);
        setSelectedFile(null);
        dispatch(updateUser({ profilePhoto: null, photoThumbnail: null }));
        setFeedback({ type: 'success', text: 'Profile photo removed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.message || 'Failed to remove photo' });
    } finally {
      setIsSaving(false);
    }
  };

  // Save profile info (full name & unique username)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (usernameStatus && !usernameStatus.available && username !== user?.username) {
      setFeedback({ type: 'error', text: 'Please choose an available username' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await axios.put('/api/users/profile', {
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim() || undefined
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data.success) {
        const updated = res.data.data;
        dispatch(updateUser({
          fullName: updated.fullName,
          username: updated.username,
          phone: updated.phone
        }));
        setFeedback({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err?.response?.data?.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayPhoto = previewUrl || profilePhoto || null;
  const userInitials = (fullName || user?.fullName || 'U').charAt(0).toUpperCase();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-modal, var(--bg-card))',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '2rem',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>User Profile &amp; Photo</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Manage identity, unique username and WebP profile photo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171'
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Photo Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', gap: '0.85rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              background: currentDisplayPhoto
                ? `url(${currentDisplayPhoto}) center/cover no-repeat`
                : 'linear-gradient(135deg, #10b981, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 800,
              color: '#fff',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden'
            }}>
              {!currentDisplayPhoto && userInitials}
            </div>

            {/* Quick Camera Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Select photo from device"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid var(--bg-modal, var(--bg-card))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <Camera size={16} />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            style={{ display: 'none' }}
          />

          {/* Upload / Save / Remove Photo Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedFile ? (
              <button
                type="button"
                onClick={handleUploadPhoto}
                disabled={isUploadingPhoto}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                {isUploadingPhoto ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                {isUploadingPhoto ? `Optimizing & Uploading (${uploadProgress}%)` : 'Save & Compress Photo'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <Camera size={14} /> Change Photo
              </button>
            )}

            {profilePhoto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isSaving}
                className="btn btn-danger btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <Trash2 size={14} /> Remove Photo
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Auto-compressed to WebP (512x512 avatar + 128x128 thumbnail, EXIF stripped)
          </span>
        </div>

        {/* Profile Info Form */}
        <form onSubmit={handleSaveProfile}>
          {/* Full Name */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.4rem' }}>
              Full Display Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Unique Username */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                Unique Handle (@username) *
              </label>
              {isCheckingUsername && (
                <span style={{ fontSize: '0.74rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Loader2 size={12} className="spin" /> Checking availability...
                </span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <AtSign size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="e.g. rahul_sharma"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: usernameStatus?.available
                    ? '1px solid #10b981'
                    : usernameStatus?.available === false
                    ? '1px solid #ef4444'
                    : '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            {/* Error or Taken Alert */}
            {usernameError && (
              <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={12} /> {usernameError}
              </div>
            )}

            {usernameStatus && (
              <div style={{ marginTop: '0.45rem' }}>
                {usernameStatus.available ? (
                  <div style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> @{username} is available!
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, marginBottom: '0.4rem' }}>
                      <AlertCircle size={14} /> This username is already taken. Please choose another username.
                    </div>

                    {/* Suggestions */}
                    {usernameStatus.suggestions && usernameStatus.suggestions.length > 0 && (
                      <div style={{ background: 'var(--bg-elevated)', padding: '0.6rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                          Available alternatives:
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {usernameStatus.suggestions.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => setUsername(sug)}
                              style={{
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                fontSize: '0.75rem',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontFamily: 'monospace'
                              }}
                            >
                              @{sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account Type</span>
            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') || 'Player'}
            </span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (usernameStatus && !usernameStatus.available && username !== user?.username)}
              className="btn btn-primary"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            >
              {isSaving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.2)', paddingTop: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171', display: 'block' }}>
                  Deactivate or Delete Account
                </span>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Deactivates account and schedules permanent data deletion.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: 6,
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Trash2 size={13} /> Delete My Account
              </button>
            </div>
          </div>
        </form>

        {/* Confirmation Modal Dialog for Account Deletion */}
        {showDeleteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: 450,
                padding: '1.5rem',
                borderRadius: 16,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'var(--bg-card, #111827)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.75rem' }}>
                <AlertCircle size={22} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Confirm Account Deletion</h3>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                Your account will be <strong>deactivated immediately</strong> and you will be logged out of all active sessions. Your personal data is scheduled for permanent anonymization after a 30-day grace period. Historical scorecards are preserved for teammates without PII.
              </p>

              {deleteError && (
                <div style={{ padding: '0.6rem', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-heading)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Password (to verify your identity):
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input"
                  style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-heading)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Optional Reason:
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Why are you deleting your account?"
                  className="input"
                  style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeleteError(''); }}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      setDeleteError('');
                      const res = await axios.post('/api/users/me/delete-request', {
                        password: deletePassword || undefined,
                        reason: deleteReason
                      }, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                      });

                      if (res.data.success) {
                        alert(res.data.message);
                        dispatch(logout());
                        setShowDeleteModal(false);
                        onClose();
                        window.location.href = '/';
                      }
                    } catch (err) {
                      setDeleteError(err?.response?.data?.message || 'Failed to delete account.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  {isDeleting ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                  {isDeleting ? 'Deactivating...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
