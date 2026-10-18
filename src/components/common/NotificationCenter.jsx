'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import socket from '../../services/socket';
import {
  Bell, Check, CheckCheck, MessageSquare, Trophy,
  ExternalLink, Clock, User
} from 'lucide-react';

export default function NotificationCenter() {
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/users/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token]);

  // Initial fetch and click outside listener
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Handle Socket.IO real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Join user's private notification channel
    socket.emit('join:user', { userId: user.id });

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setHasNewAlert(true);
      setTimeout(() => setHasNewAlert(false), 3000);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.emit('leave:user', { userId: user.id });
    };
  }, [isAuthenticated, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark single notification as read and navigate
  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await axios.put(`/api/users/notifications/${notif.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('Failed to mark read:', e);
    }

    setIsOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await axios.put('/api/users/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? '#38bdf8' : '#94a3b8',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease'
        }}
      >
        <Bell size={18} className={hasNewAlert ? 'pulse-alert' : ''} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#ef4444',
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 800,
            borderRadius: '10px',
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0f172a'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: 'min(90vw, 360px)',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>Notifications</span>
              {unreadCount > 0 && (
                <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <Bell size={28} style={{ opacity: 0.3, margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontSize: '0.85rem' }}>No notifications yet</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>When someone mentions you, it will appear here</div>
              </div>
            ) : (
              notifications.map((notif) => {
                const authorPhoto = notif.metadata?.authorPhoto;
                const authorName = notif.metadata?.authorName || 'Someone';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: notif.isRead ? 'transparent' : 'rgba(56, 189, 248, 0.06)',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(56, 189, 248, 0.06)')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: authorPhoto
                        ? `url(${authorPhoto}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #10b981, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#fff',
                      fontSize: '0.9rem',
                      flexShrink: 0
                    }}>
                      {!authorPhoto && authorName.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: notif.isRead ? 500 : 700, color: '#f8fafc', lineHeight: 1.4 }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', marginTop: 6, flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
