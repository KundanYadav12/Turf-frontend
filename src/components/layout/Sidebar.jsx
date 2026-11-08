'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { usePathname } from 'next/navigation';
import { Link, useNavigate } from '../../lib/routerCompat';
import {
  Trophy, MapPin, Calendar, Users, MessageSquare, Shield,
  LayoutDashboard, Tv, MonitorPlay, ChevronDown, ChevronRight,
  LogOut, User, Settings, Sparkles, HelpCircle, X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import chatService from '../../services/chatService';
import { getSocket } from '../../services/socket';
import { logout } from '../../features/auth/authSlice';
import { clearTeamState } from '../../features/team/teamSlice';
import { useBranding } from '../providers/BrandingProvider';

/**
 * Unified Navigation Configuration with Role-Based Access Control
 */
const NAV_CONFIG = [
  {
    section: 'Overview',
    items: [
      {
        id: 'profile',
        label: 'My Profile',
        path: '/profile',
        icon: User,
        roles: ['PLAYER', 'VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN', 'VENUE_STAFF', 'SCORER']
      },
      {
        id: 'venues',
        label: 'Explore Venues',
        path: '/',
        icon: MapPin,
        roles: ['*'], // Public
        exact: true
      },
      {
        id: 'bookings',
        label: 'My Bookings',
        path: '/my-bookings',
        icon: Calendar,
        roles: ['PLAYER', 'VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN', 'VENUE_STAFF', 'SCORER']
      },
      {
        id: 'chat',
        label: 'Chat',
        path: '/chat',
        icon: MessageSquare,
        roles: ['PLAYER', 'VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN', 'VENUE_STAFF', 'SCORER'],
        badgeKey: 'chat'
      }
    ]
  },
  {
    section: 'Competition',
    items: [
      {
        id: 'tournaments',
        label: 'Tournaments',
        path: '/tournaments',
        icon: Trophy,
        roles: ['*'],
        children: [
          { label: 'All Leagues', path: '/tournaments' },
          { label: 'Live Matches', path: '/tournaments?filter=live' }
        ]
      },
      {
        id: 'teams',
        label: 'Teams',
        path: '/teams',
        icon: Users,
        roles: ['*']
      }
    ]
  },
  {
    section: 'Management',
    items: [
      {
        id: 'owner_dashboard',
        label: 'Owner Dashboard',
        path: '/owner/dashboard',
        icon: LayoutDashboard,
        roles: ['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']
      },
      {
        id: 'owner_calendar',
        label: 'Court Calendar',
        path: '/owner/calendar',
        icon: Calendar,
        roles: ['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN']
      },
      {
        id: 'admin_portal',
        label: 'Admin Portal',
        path: '/admin/dashboard',
        icon: Shield,
        roles: ['ADMIN', 'SUPER_ADMIN']
      }
    ]
  },
  {
    section: 'Broadcast & Display',
    items: [
      {
        id: 'tv_broadcast',
        label: 'Smart TV Mode',
        path: '/tv',
        icon: Tv,
        roles: ['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN', 'SCORER', 'PLAYER']
      },
      {
        id: 'tv_emulator',
        label: 'Signage Emulator',
        path: '/tv-emulator',
        icon: MonitorPlay,
        roles: ['VENUE_OWNER', 'ADMIN', 'SUPER_ADMIN', 'SCORER']
      }
    ]
  }
];

export default function Sidebar({
  isMobileOpen = false,
  onCloseMobile = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {}
}) {
  const pathname = usePathname() || '/';
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { appName, appTagline, logoUrl } = useBranding();

  const [mounted, setMounted] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Normalize current user role
  const userRole = useMemo(() => {
    if (!isAuthenticated || !user) return 'GUEST';
    return String(user.role || 'PLAYER').toUpperCase();
  }, [isAuthenticated, user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Unread Chat Count via REST + Socket.IO
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadChatCount(0);
      return;
    }

    // Initial total unread fetch
    chatService.getTotalUnread()
      .then((count) => setUnreadChatCount(Number(count) || 0))
      .catch(() => {});

    const socket = getSocket();
    if (socket && user.id) {
      socket.emit('join:user', { userId: user.id });

      const handleUnreadTotal = ({ totalUnread }) => {
        setUnreadChatCount(totalUnread !== undefined ? Number(totalUnread) : 0);
      };

      const handleConvUpdated = () => {
        chatService.getTotalUnread()
          .then((count) => setUnreadChatCount(Number(count) || 0))
          .catch(() => {});
      };

      socket.on('chat:total_unread', handleUnreadTotal);
      socket.on('chat:conversation_updated', handleConvUpdated);

      return () => {
        socket.off('chat:total_unread', handleUnreadTotal);
        socket.off('chat:conversation_updated', handleConvUpdated);
      };
    }
  }, [isAuthenticated, user]);

  // Keep submenus open if current route is within that submenu
  useEffect(() => {
    NAV_CONFIG.forEach(sec => {
      sec.items.forEach(item => {
        if (item.children) {
          const isChildActive = item.children.some(c => pathname === c.path.split('?')[0]);
          if (isChildActive || pathname.startsWith(item.path)) {
            setOpenSubmenus(prev => ({ ...prev, [item.id]: true }));
          }
        }
      });
    });
  }, [pathname]);

  // Toggle submenu open/close
  const toggleSubmenu = (itemId) => {
    setOpenSubmenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Check if item is authorized for user
  const isItemAuthorized = useCallback((item) => {
    if (!item.roles || item.roles.includes('*')) return true;
    if (!isAuthenticated) return false;
    return item.roles.includes(userRole);
  }, [isAuthenticated, userRole]);

  // Filter sections and items based on permissions
  const visibleSections = useMemo(() => {
    return NAV_CONFIG.map(sec => ({
      ...sec,
      items: sec.items.filter(isItemAuthorized)
    })).filter(sec => sec.items.length > 0);
  }, [isItemAuthorized]);

  // Check active navigation link
  const isLinkActive = (item) => {
    if (item.exact) return pathname === item.path;
    if (item.path === '/') return pathname === '/';
    return pathname.startsWith(item.path);
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearTeamState());
    onCloseMobile();
    navigate('/login');
  };

  // Keyboard navigation & accessibility on mobile drawer + [ to toggle collapse on desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      } else if (
        e.key === '[' &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        onToggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile, onToggleCollapse]);

  // Render Skeleton while auth rehydration is resolving
  if (!mounted) {
    return (
      <>
        <div
          className="app-desktop-sidebar-spacer"
          style={{
            width: isCollapsed ? '72px' : '260px',
            minWidth: isCollapsed ? '72px' : '260px',
            flexShrink: 0,
            display: 'none'
          }}
          aria-hidden="true"
        />
        <aside
          suppressHydrationWarning
          style={{
            width: isCollapsed ? '72px' : '260px',
            minWidth: isCollapsed ? '72px' : '260px',
            background: 'var(--bg-card-solid, #0f172a)',
            borderRight: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            height: '100vh',
            maxHeight: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 40,
            display: 'none',
            flexDirection: 'column',
            padding: '1.25rem 0.85rem'
          }}
          className="app-desktop-sidebar"
          aria-hidden="true"
        >
          <div style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.06)', marginBottom: '1.5rem' }} />
          <div style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: '0.85rem' }} />
          <div style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: '0.85rem' }} />
          <div style={{ height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        </aside>
        <style>{`
          @media (min-width: 769px) {
            .app-desktop-sidebar { display: flex !important; }
            .app-desktop-sidebar-spacer { display: block !important; }
          }
        `}</style>
      </>
    );
  }

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-card-solid, #0f172a)',
        borderRight: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        color: 'var(--text-main, #f8fafc)',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* ── Brand Header ── */}
      <div
        style={{
          padding: isCollapsed ? '0.85rem 0.45rem' : '1.15rem 1.25rem',
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: isCollapsed ? '0.45rem' : '0',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          minHeight: '65px',
          flexShrink: 0
        }}
      >
        <Link
          to="/"
          onClick={onCloseMobile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: 'inherit'
          }}
          title={`${appName} Home`}
        >
          <img
            src={logoUrl || "/logo.png"}
            alt={`${appName} Logo`}
            style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              objectFit: 'contain',
              boxShadow: '0 0 14px rgba(18, 32, 69, 0.35)',
              flexShrink: 0
            }}
          />
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main, #ffffff)' }}>
                {appName}
              </span>
              <span style={{ fontSize: '0.66rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {appTagline}
              </span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem', color: 'var(--text-muted, #94a3b8)' }}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        )}

        {/* Desktop collapse button (when expanded) */}
        {!isMobileOpen && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="btn btn-ghost btn-xs"
            style={{
              padding: '0.3rem',
              color: 'var(--text-muted, #94a3b8)',
              borderRadius: '6px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Collapse Sidebar ([)"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}

        {/* Desktop expand button (when collapsed) */}
        {!isMobileOpen && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="btn btn-ghost btn-xs"
            style={{
              padding: '0.35rem',
              color: '#10b981',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginTop: '0.15rem'
            }}
            title="Expand Sidebar ([)"
            aria-label="Expand Sidebar"
            onMouseEnter={() => setActiveTooltip('expand_sidebar_header')}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      {/* ── Scrollable Nav Items ── */}
      <nav
        className="app-sidebar-nav"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
        aria-label="Main Navigation"
      >
        {visibleSections.map((sec) => (
          <div key={sec.section}>
            {/* Section Heading */}
            {!isCollapsed && (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-dim, #64748b)',
                  padding: '0.25rem 0.65rem 0.45rem',
                }}
              >
                {sec.section}
              </div>
            )}

            {/* Section Item List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {sec.items.map((item) => {
                const IconComponent = item.icon;
                const active = isLinkActive(item);
                const hasSub = item.children && item.children.length > 0;
                const isOpen = openSubmenus[item.id];
                const badge = item.badgeKey === 'chat'
                  ? unreadChatCount
                  : (item.id === 'profile' && user?.assignedMatchesCount ? user.assignedMatchesCount : 0);

                return (
                  <div key={item.id} style={{ position: 'relative' }}>
                    <div
                      className={`app-sidebar-item ${active ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '9px',
                        background: active ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.05) 100%)' : 'transparent',
                        borderLeft: active ? '3px solid #10b981' : '3px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={() => isCollapsed && setActiveTooltip(item.id)}
                      onMouseLeave={() => isCollapsed && setActiveTooltip(null)}
                    >
                      <Link
                        to={item.path}
                        onClick={(e) => {
                          if (active && !hasSub) {
                            e.preventDefault();
                          }
                          if (!hasSub) onCloseMobile();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: isCollapsed ? 0 : '0.75rem',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          padding: isCollapsed ? '0.7rem 0' : '0.6rem 0.65rem',
                          color: active ? '#10b981' : 'var(--text-secondary, #cbd5e1)',
                          fontWeight: active ? 700 : 500,
                          fontSize: '0.86rem',
                          textDecoration: 'none',
                          flex: 1,
                          minWidth: 0,
                          position: 'relative'
                        }}
                        aria-current={active ? 'page' : undefined}
                      >
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconComponent
                            size={19}
                            style={{
                              color: active ? '#10b981' : 'currentColor',
                              flexShrink: 0
                            }}
                          />
                          {/* Dot / Number Badge in Collapsed Mode */}
                          {isCollapsed && badge > 0 && (
                            <span
                              style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-7px',
                                background: '#10b981',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '1px 4px',
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                lineHeight: 1,
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                              }}
                            >
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </div>

                        {!isCollapsed && (
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>

                      {/* Right side Badge / Chevron in Expanded Mode */}
                      {!isCollapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingRight: '0.5rem' }}>
                          {badge > 0 && (
                            <span
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#ffffff',
                                borderRadius: '12px',
                                padding: '0.15rem 0.5rem',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                lineHeight: 1,
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                              }}
                            >
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}

                          {hasSub && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSubmenu(item.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted, #94a3b8)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              aria-label={`Toggle ${item.label} submenu`}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Collapsed Tooltip */}
                      {isCollapsed && activeTooltip === item.id && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '100%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            marginLeft: '10px',
                            background: 'rgba(15, 23, 42, 0.96)',
                            border: '1px solid var(--border-color, rgba(255,255,255,0.18))',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            zIndex: 9999,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {item.label}
                          {badge > 0 && (
                            <span style={{ background: '#10b981', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem' }}>
                              {badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submenu links (Expanded Mode) */}
                    {!isCollapsed && hasSub && isOpen && (
                      <div
                        style={{
                          marginLeft: '1.85rem',
                          marginTop: '0.2rem',
                          paddingLeft: '0.65rem',
                          borderLeft: '1.5px solid var(--border-color, rgba(255,255,255,0.1))',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem'
                        }}
                      >
                        {item.children.map((child) => {
                          const childActive = pathname === child.path.split('?')[0];
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={(e) => {
                                if (childActive) {
                                  e.preventDefault();
                                }
                                onCloseMobile();
                              }}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                color: childActive ? '#10b981' : 'var(--text-muted, #94a3b8)',
                                fontWeight: childActive ? 700 : 500,
                                textDecoration: 'none',
                                background: childActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Collapse/Expand Footer Toggle (Desktop) ── */}
      {!isMobileOpen && (
        <div
          style={{
            borderTop: '1px solid var(--border-color, rgba(255,255,255,0.06))',
            padding: isCollapsed ? '0.6rem 0.4rem' : '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-end',
            background: 'rgba(0, 0, 0, 0.08)',
            flexShrink: 0
          }}
        >
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              transition: 'all 0.15s ease'
            }}
            title={isCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#10b981';
              if (isCollapsed) setActiveTooltip('expand_sidebar_bottom');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted, #94a3b8)';
              if (isCollapsed) setActiveTooltip(null);
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : (
              <>
                <PanelLeftClose size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── User Profile Footer ── */}
      <div
        style={{
          borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          padding: isCollapsed ? '0.85rem 0.5rem' : '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          background: 'rgba(0, 0, 0, 0.15)',
          flexShrink: 0
        }}
      >
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, width: isCollapsed ? 'auto' : '100%', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
            <Link
              to="/profile"
              onClick={onCloseMobile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                minWidth: 0,
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
              }}
              title="My Profile"
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: user.profilePhoto || user.photoThumbnail
                    ? `url(${user.photoThumbnail || user.profilePhoto}) center/cover no-repeat`
                    : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  flexShrink: 0,
                  border: '1.5px solid rgba(16, 185, 129, 0.4)'
                }}
              >
                {!(user.profilePhoto || user.photoThumbnail) && (user.fullName?.charAt(0) || 'U')}
              </div>
              {!isCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.fullName || 'User'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                    {user.role || 'PLAYER'}
                  </div>
                </div>
              )}
            </Link>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--text-muted, #94a3b8)', padding: '0.35rem', borderRadius: '6px' }}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        ) : (
          !isCollapsed ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <Link to="/login" onClick={onCloseMobile} className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}>
                Login
              </Link>
              <Link to="/register" onClick={onCloseMobile} className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}>
                Register
              </Link>
            </div>
          ) : (
            <Link to="/login" style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Login">
              <User size={20} />
            </Link>
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop / Tablet Spacer (reserves layout space in document flow) ── */}
      <div
        className="app-desktop-sidebar-spacer"
        style={{
          width: isCollapsed ? '72px' : '260px',
          minWidth: isCollapsed ? '72px' : '260px',
          flexShrink: 0,
          display: 'none',
          transition: 'width 180ms cubic-bezier(0.4, 0, 0.2, 1), min-width 180ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        aria-hidden="true"
      />

      {/* ── Desktop / Tablet Rock-Solid Fixed Sidebar ── */}
      <aside
        suppressHydrationWarning
        style={{
          width: isCollapsed ? '72px' : '260px',
          minWidth: isCollapsed ? '72px' : '260px',
          height: '100vh',
          maxHeight: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 40,
          transition: 'width 180ms cubic-bezier(0.4, 0, 0.2, 1), min-width 180ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'none',
          flexShrink: 0,
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.18)',
          borderRight: '1px solid var(--border-color, rgba(255,255,255,0.08))'
        }}
        className="app-desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile Off-Canvas Drawer & Backdrop ── */}
      {isMobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex' }}>
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.2s ease-out'
            }}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              maxWidth: '85vw',
              height: '100%',
              zIndex: 1,
              animation: 'slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Media query styling & sleek scrollbar for sidebar */}
      <style>{`
        @media (min-width: 769px) {
          .app-desktop-sidebar {
            display: flex !important;
          }
          .app-desktop-sidebar-spacer {
            display: block !important;
          }
        }
        /* Sleek modern custom scrollbar for sidebar nav */
        .app-sidebar-nav {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
        .app-sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }
        .app-sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .app-sidebar-nav::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .app-sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.45);
        }
        /* Item hover effect */
        .app-sidebar-item {
          transition: background 0.15s ease, color 0.15s ease;
        }
        .app-sidebar-item:hover:not(.active) {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .app-sidebar-item:hover:not(.active) a {
          color: var(--text-main, #ffffff) !important;
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

