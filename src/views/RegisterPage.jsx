'use client';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { registerApi } from '../services/authService';
import { setCredentials } from '../features/auth/authSlice';
import { Trophy, UserCheck, AlertCircle } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PLAYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await registerApi({ fullName, email, phone, password, role });
      if (res.success) {
        dispatch(setCredentials(res.data));
        if (role === 'VENUE_OWNER') navigate('/owner/dashboard');
        else navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = role === 'VENUE_OWNER';

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(92vw, 480px)', padding: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Trophy size={32} color="var(--accent-primary)" />
            <span>TurfSpot</span>
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Join as a Player or Venue Owner
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid var(--accent-rose)',
            color: 'var(--accent-rose)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Role Toggle Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setRole('PLAYER')}
            className="btn btn-sm"
            style={{
              background: !isOwner ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
              color: !isOwner ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: !isOwner ? 'none' : '1px solid var(--border-color)',
              padding: '0.75rem'
            }}
          >
            🏃 Player Account
          </button>
          <button
            type="button"
            onClick={() => setRole('VENUE_OWNER')}
            className="btn btn-sm"
            style={{
              background: isOwner ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
              color: isOwner ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: isOwner ? 'none' : '1px solid var(--border-color)',
              padding: '0.75rem'
            }}
          >
            🏟️ Turf Owner
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              id="register-name"
              type="text"
              required
              placeholder="e.g. Kundan Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="register-email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              id="register-phone"
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="register-password"
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Creating Account…' : <><UserCheck size={18} /> Register Now</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
