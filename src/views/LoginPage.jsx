'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginApi, forgotPasswordApi, verifyResetCodeApi, resetPasswordApi } from '../services/authService';
import { setCredentials } from '../features/auth/authSlice';
import { 
  Trophy, 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Send,
  ShieldCheck 
} from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Mode: 'login' | 'forgot'
  const [mode, setMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password flow state
  // Steps: 1 = Email Input, 2 = Code + New Password, 3 = Success
  const [forgotStep, setForgotStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Parse query params for resetToken, email, or mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('resetToken');
    const paramEmail = searchParams.get('email');
    const paramMode = searchParams.get('mode');

    if (paramEmail) {
      setEmail(paramEmail);
      setResetEmail(paramEmail);
    }

    if (token) {
      setResetToken(token);
      setMode('forgot');
      setForgotStep(2);
      setForgotSuccess('Reset token verified. Please enter your new password.');
    } else if (paramMode === 'forgot') {
      setMode('forgot');
      setForgotStep(1);
    }
  }, []);

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Standard Login submit
  const handleLoginSubmit = async (e) => {
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
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
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

  // Step 1: Send Reset Code to Email
  const handleSendResetCode = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!resetEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }

    try {
      setForgotLoading(true);
      const res = await forgotPasswordApi({ email: resetEmail });
      if (res.success) {
        setForgotStep(2);
        setForgotSuccess(res.message || `A 6-digit verification code has been sent to ${resetEmail}.`);
        setResendCooldown(60);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send reset code. Please check the email entered.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend code trigger
  const handleResendCode = async () => {
    if (resendCooldown > 0 || forgotLoading) return;
    setForgotError('');
    setForgotSuccess('');

    try {
      setForgotLoading(true);
      const res = await forgotPasswordApi({ email: resetEmail });
      if (res.success) {
        setForgotSuccess(`New code sent to ${resetEmail}!`);
        setResendCooldown(60);
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Reset Password with OTP Code or Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!resetToken && (!resetCode || resetCode.trim().length !== 6)) {
      setForgotError('Please enter the valid 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    try {
      setForgotLoading(true);
      const payload = {
        email: resetEmail,
        code: resetCode.trim(),
        token: resetToken || undefined,
        newPassword
      };

      const res = await resetPasswordApi(payload);
      if (res.success) {
        setForgotStep(3);
        setForgotSuccess(res.message || 'Password reset successfully!');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Switch back to Login view
  const switchToLogin = () => {
    setMode('login');
    setForgotStep(1);
    setForgotError('');
    setForgotSuccess('');
    setError('');
    // Prefill the email in the login form if we completed reset
    if (resetEmail) {
      setEmail(resetEmail);
    }
  };

  return (
    <div className="container" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(92vw, 440px)', padding: 'clamp(1.5rem, 3.5vw, 2.5rem)', position: 'relative' }}>

        {/* ========================================================================= */}
        {/* VIEW A: STANDARD LOGIN VIEW                                              */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <>
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

            <form onSubmit={handleLoginSubmit}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    id="login-forgot-password-link"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setResetEmail(email || '');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px'
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
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
              <Link
                to={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect') ? `/register?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect'))}` : '/register'}
                style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
              >
                Create One
              </Link>
            </p>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: FORGOT PASSWORD FLOW (STEP 1, 2, 3)                               */}
        {/* ========================================================================= */}
        {mode === 'forgot' && (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
                <KeyRound size={32} color="var(--accent-primary)" />
                <span>TurfSpot</span>
              </div>
              <h2 style={{ fontSize: '1.5rem' }}>
                {forgotStep === 1 && 'Reset Your Password'}
                {forgotStep === 2 && 'Verify & Set Password'}
                {forgotStep === 3 && 'Password Reset!'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                {forgotStep === 1 && 'Enter your registered email address and we will send you a 6-digit verification code.'}
                {forgotStep === 2 && `Enter the 6-digit code sent to ${resetEmail || 'your email'} along with your new password.`}
                {forgotStep === 3 && 'Your account password has been updated securely.'}
              </p>
            </div>

            {/* Error Notice */}
            {forgotError && (
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
                {forgotError}
              </div>
            )}

            {/* Success Notice */}
            {forgotSuccess && forgotStep !== 3 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--accent-primary-glow)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={16} />
                {forgotSuccess}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendResetCode}>
                <div className="form-group">
                  <label className="form-label">Registered Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      placeholder="Enter your registered email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      autoFocus
                    />
                    <Mail
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '0.85rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                </div>

                <button
                  id="forgot-send-code-btn"
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {forgotLoading ? (
                    <>Sending Verification Code…</>
                  ) : (
                    <>
                      <Send size={16} /> Send Verification Code
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 500
                    }}
                  >
                    <ArrowLeft size={16} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit Code & New Password */}
            {forgotStep === 2 && (
              <form onSubmit={handleResetPassword}>
                {/* 6-Digit Code Input (if not resetting via direct token) */}
                {!resetToken && (
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">6-Digit Verification Code</label>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0 || forgotLoading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: resendCooldown > 0 ? 'default' : 'pointer',
                          padding: 0
                        }}
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="forgot-code-input"
                        type="text"
                        maxLength={6}
                        required
                        placeholder="e.g. 123456"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="form-input"
                        style={{
                          letterSpacing: '4px',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          paddingLeft: '1rem',
                          fontFamily: 'monospace'
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* New Password */}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="forgot-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="forgot-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  id="forgot-reset-submit-btn"
                  type="submit"
                  disabled={forgotLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {forgotLoading ? (
                    <>Updating Password…</>
                  ) : (
                    <>
                      <ShieldCheck size={18} /> Update Password
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <ArrowLeft size={14} /> Change Email
                  </button>

                  <button
                    type="button"
                    onClick={switchToLogin}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {forgotStep === 3 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  border: '2px solid var(--accent-primary)'
                }}>
                  <CheckCircle2 size={36} color="var(--accent-primary)" />
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                  Your password has been changed successfully. You can now use your new password to sign into your account.
                </p>

                <button
                  id="forgot-success-login-btn"
                  type="button"
                  onClick={switchToLogin}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <LogIn size={18} /> Proceed to Sign In
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
