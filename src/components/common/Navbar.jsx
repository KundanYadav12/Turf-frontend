'use client';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { clearTeamState } from '../../features/team/teamSlice';
import { toggleTheme } from '../../features/theme/themeSlice';
import { Trophy, MapPin, User, LogOut, LayoutDashboard, Calendar, Shield, Sun, Moon, Menu, X, Users, Settings, MessageSquare, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import UserProfileModal from '../player/UserProfileModal';
import { useBranding } from '../providers/BrandingProvider';

const Navbar = ({
  onToggleMobileSidebar = () => {},
  isSidebarCollapsed = false,
  onToggleSidebarCollapse = () => {}
}) => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { appName, logoUrl, showExploreVenues, showMyBookings } = useBranding();

  const [isMounted, setIsMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearTeamState());
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* Desktop Sidebar Collapse / Expand Toggle */}
            <button
              onClick={onToggleSidebarCollapse}
              className="btn btn-ghost btn-sm desktop-sidebar-toggle-btn"
              style={{
                padding: '0.4rem',
                borderRadius: '8px',
                color: isSidebarCollapsed ? '#10b981' : 'var(--text-main, #f8fafc)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSidebarCollapsed ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                cursor: 'pointer'
              }}
              title={isSidebarCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>

            {/* Mobile / Tablet Sidebar Drawer Toggle */}
            <button
              onClick={onToggleMobileSidebar}
              className="btn btn-ghost btn-sm mobile-sidebar-toggle-btn"
              style={{
                padding: '0.4rem',
                borderRadius: '8px',
                color: 'var(--text-main, #f8fafc)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Open navigation menu"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Brand Logo */}
            <Link to="/" className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
              <img
                src={logoUrl || "/logo.png"}
                alt={`${appName} Logo`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  objectFit: 'contain',
                  boxShadow: '0 0 14px rgba(18, 32, 69, 0.35)',
                  flexShrink: 0
                }}
              />
              <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-main, #ffffff)' }}>{appName}</span>
            </Link>
          </div>

          {/* Desktop Nav Links (Hidden on mobile) */}
          <ul className="nav-links-desktop">
            {showExploreVenues !== false && (
              <li>
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                  Explore Venues
                </Link>
              </li>
            )}
            {isMounted && isAuthenticated && showMyBookings !== false && (
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
                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <Link to="/admin/dashboard" className="btn btn-secondary btn-sm">
                      <Shield size={16} /> Admin
                    </Link>
                  )}

                  {/* Profile Trigger Pill */}
                  <Link
                    to="/profile"
                    className="badge badge-success"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      border: 'none',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '20px',
                      textDecoration: 'none'
                    }}
                    title="My Profile"
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
                  </Link>

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
          </div>
        </div>
      </nav>

      {/* User Profile & Photo Edit Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <style>{`
        .mobile-sidebar-toggle-btn {
          display: none;
        }
        .desktop-sidebar-toggle-btn {
          display: inline-flex;
        }
        @media (max-width: 768px) {
          .mobile-sidebar-toggle-btn {
            display: inline-flex !important;
          }
          .desktop-sidebar-toggle-btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
