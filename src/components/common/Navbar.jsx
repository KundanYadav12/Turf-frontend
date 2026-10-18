'use client';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { clearTeamState } from '../../features/team/teamSlice';
import { toggleTheme } from '../../features/theme/themeSlice';
import { Trophy, MapPin, User, LogOut, LayoutDashboard, Calendar, Shield, Sun, Moon, Menu, X, Users, Settings } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import UserProfileModal from '../player/UserProfileModal';

const Navbar = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 868 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearTeamState());
    setIsMobileMenuOpen(false);
    navigate('/login');
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const isLight = mode === 'light';

  return (
    <>
      <nav className="navbar">
        <div className="container nav-content">
          {/* Brand Logo */}
          <Link to="/" className="brand-logo" onClick={() => setIsMobileMenuOpen(false)}>
            <Trophy size={28} color="#10b981" />
            <span>TurfSpot</span>
          </Link>

          {/* Desktop Nav Links (Hidden on mobile) */}
          <ul className="nav-links-desktop">
            <li>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                Explore Venues
              </Link>
            </li>
            {isMounted && isAuthenticated && (
              <li>
                <Link to="/my-bookings" className={`nav-link ${location.pathname === '/my-bookings' ? 'active' : ''}`}>
                  My Bookings
                </Link>
              </li>
            )}
            <li>
              <Link to="/teams" className={`nav-link ${location.pathname.startsWith('/teams') ? 'active' : ''}`}>
                Teams
              </Link>
            </li>
            <li>
              <Link to="/tournaments" className={`nav-link ${location.pathname.startsWith('/tournaments') ? 'active' : ''}`}>
                Tournaments
              </Link>
            </li>
          </ul>

          {/* Right side: Theme toggle + Auth actions + Mobile toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>

            {/* ── Theme Toggle (Always visible) ── */}
            <button
              id="theme-toggle-btn"
              onClick={handleThemeToggle}
              className="theme-btn"
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              {/* Animated icon swap */}
              <span style={{
                position: 'absolute',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
                transform: isLight ? 'translateY(0) scale(1)' : 'translateY(-24px) scale(0)',
                opacity: isLight ? 1 : 0,
              }}>
                <Sun size={18} />
              </span>
              <span style={{
                position: 'absolute',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
                transform: isLight ? 'translateY(24px) scale(0)' : 'translateY(0) scale(1)',
                opacity: isLight ? 0 : 1,
              }}>
                <Moon size={18} />
              </span>
            </button>

            {/* ── Notification Center (Authenticated) ── */}
            {isMounted && isAuthenticated && (
              <NotificationCenter />
            )}

            {/* ── Desktop Auth Actions (Hidden on mobile) ── */}
            <div className="nav-auth-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {isMounted && isAuthenticated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {user?.role === 'VENUE_OWNER' && (
                    <Link to="/owner/dashboard" className="btn btn-secondary btn-sm">
                      <LayoutDashboard size={16} /> Owner
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin/dashboard" className="btn btn-secondary btn-sm">
                      <Shield size={16} /> Admin
                    </Link>
                  )}

                  {/* Profile Trigger Pill */}
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="badge badge-success"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      border: 'none',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '20px'
                    }}
                    title="Edit profile & photo"
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: (user?.photoThumbnail || user?.profilePhoto)
                        ? `url(${user.photoThumbnail || user.profilePhoto}) center/cover no-repeat`
                        : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {!(user?.photoThumbnail || user?.profilePhoto) && (user?.fullName?.charAt(0) || 'U')}
                    </div>
                    <span>{user?.fullName?.split(' ')[0]}</span>
                    {user?.username && (
                      <span style={{ opacity: 0.8, fontSize: '0.72rem', fontFamily: 'monospace' }}>
                        @{user.username}
                      </span>
                    )}
                  </button>

                  <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Logout">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
                </div>
              )}
            </div>

            {/* ── Mobile Menu Toggle Button (Visible on <= 868px) ── */}
            <button
              className="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Navigation Drawer & Backdrop ── */}
      {isMobileMenuOpen && (
        <>
          <div
            className="mobile-nav-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-nav-drawer" role="dialog" aria-modal="true">
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div className="brand-logo" style={{ fontSize: '1.3rem' }}>
                <Trophy size={24} color="#10b981" />
                <span>TurfSpot</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ width: 34, height: 34, padding: 0 }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <Link
                to="/"
                className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <MapPin size={18} color="var(--accent-primary)" /> Explore Venues
              </Link>
              {isMounted && isAuthenticated && (
                <Link
                  to="/my-bookings"
                  className={`mobile-nav-link ${location.pathname === '/my-bookings' ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Calendar size={18} color="var(--accent-secondary)" /> My Bookings
                </Link>
              )}
              <Link
                to="/teams"
                className={`mobile-nav-link ${location.pathname.startsWith('/teams') ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users size={18} color="var(--accent-amber)" /> Teams &amp; Rosters
              </Link>
              <Link
                to="/tournaments"
                className={`mobile-nav-link ${location.pathname.startsWith('/tournaments') ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Trophy size={18} color="var(--accent-purple)" /> Tournaments Hub
              </Link>
            </div>

            {/* Mobile User / Auth Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              {isMounted && isAuthenticated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Signed in as</span>
                    <span className="badge badge-success">
                      <User size={12} /> {user?.fullName}
                    </span>
                  </div>

                  {user?.role === 'VENUE_OWNER' && (
                    <Link
                      to="/owner/dashboard"
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LayoutDashboard size={16} /> Owner Dashboard
                    </Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin/dashboard"
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Shield size={16} /> Admin Portal
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="btn btn-danger"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <Link
                    to="/login"
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login to Account
                  </Link>
                  <Link
                    to="/register"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* User Profile & Photo Edit Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
