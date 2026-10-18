'use client';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginApi } from '../services/authService';
import { setCredentials } from '../features/auth/authSlice';
import { Trophy, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await loginApi({ email, password });
      if (res.success) {
        dispatch(setCredentials(res.data));
        const role = res.data.user.role;
        const searchParams = new URLSearchParams(window.location.search);
        const redirect = searchParams.get('redirect');
        if (redirect) {
          navigate(redirect);
        } else if (role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (role === 'VENUE_OWNER') {
          navigate('/owner/dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(92vw, 440px)', padding: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <Trophy size={32} color="var(--accent-primary)" />
            <span>TurfSpot</span>
          </div>
          <h2 style={{ fontSize: '1.6rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Login to access bookings, turfs &amp; dashboards
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

        {/* Demo Credentials Box */}
        <div style={{
          background: 'var(--accent-primary-glow)',
          border: '1px dashed var(--border-glow)',
          padding: '0.85rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.78rem',
          color: 'var(--accent-primary)',
          marginBottom: '1.5rem',
          lineHeight: 1.7
        }}>
          <strong>🎮 Demo Login:</strong><br />
          Player: <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>player@turf.com</code> / <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>admin123</code><br />
          Owner: <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>owner@turf.com</code> / <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>admin123</code><br />
          Admin: <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>admin@turf.com</code> / <code style={{ background: 'var(--bg-tag)', padding: '0 4px', borderRadius: 4 }}>admin123</code>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating…' : (<><LogIn size={18} /> Sign In</>)}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
            Create One
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
