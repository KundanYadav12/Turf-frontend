'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { Link, useNavigate } from '../lib/routerCompat';
import chatService from '../services/chatService';
import { getSocket } from '../services/socket';
import {
  MessageSquare, Send, Image as ImageIcon, Search, Users, Shield,
  X, CornerUpLeft, Trash2, Edit2, ChevronDown, ArrowLeft,
  Lock, Trophy, User, ArrowDown, Check, CheckCheck, RefreshCw, Info, Download
} from 'lucide-react';

// Curated distinctive accessible colors for group chat senders
const SENDER_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6'
];

function getSenderColor(nameOrId) {
  const str = String(nameOrId || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

/**
 * Dedicated Avatar Component with robust Error Fallback to initials or type icon
 * Never renders broken images or raw alt text
 */
function ChatAvatar({ imageUrl, title, type, size = 42, isOnline = false }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const initials = useMemo(() => {
    if (!title || typeof title !== 'string') return 'U';
    const clean = title.trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, [title]);

  const bgGradient = useMemo(() => {
    if (type === 'TEAM') return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    if (type === 'TOURNAMENT') return 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
    return 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
  }, [type]);

  const borderRadius = type === 'DIRECT' ? '50%' : '12px';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius,
        flexShrink: 0
      }}
    >
      {imageUrl && !hasError ? (
        <img
          src={imageUrl}
          alt=""
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius,
            background: bgGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: size * 0.36,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)'
          }}
        >
          {initials}
        </div>
      )}

      {/* Online indicator for Direct Chats */}
      {isOnline && type === 'DIRECT' && (
        <span
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid var(--bg-card-solid, #0f172a)'
          }}
          title="Online"
        />
      )}
    </div>
  );
}

/**
 * Format date separator ("Today", "Yesterday", or "DD MMM YYYY")
 */
function formatDateSeparator(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ChatPage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const themeMode = useSelector((state) => state.theme?.mode) || 'dark';
  const isLight = themeMode === 'light';
  const navigate = useNavigate();
  const searchParams = useSearchParams();

  // URL query params
  const initialConvId = searchParams.get('conv');
  const teamParam = searchParams.get('team');
  const tournamentParam = searchParams.get('tournament');
  const userParam = searchParams.get('user');

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConvList, setLoadingConvList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, TEAMS, TOURNAMENTS, DIRECT
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [lightboxImage, setLightboxImage] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);

  // New Chat Modal & User Search
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Add Member Modal
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedAddMembers, setSearchedAddMembers] = useState([]);

  // Editing Message
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');

  // Scroll behavior & Jump-to-bottom
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [unreadNewCount, setUnreadNewCount] = useState(0);

  // Refs
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Responsive state (guarded from SSR window crash)
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Initial Socket Connection & Listeners
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = getSocket();
    socketRef.current = socket;

    if (socket && user.id) {
      socket.emit('join:user', { userId: user.id });

      const handleNewMessage = (msg) => {
        setMessages((prev) => {
          if (activeConv && Number(activeConv.id) === Number(msg.conversationId)) {
            if (prev.some((m) => m.id === msg.id || m.uuid === msg.uuid)) {
              return prev;
            }
            return [...prev, msg];
          }
          return prev;
        });

        if (activeConv && Number(activeConv.id) === Number(msg.conversationId)) {
          chatService.markAsRead(activeConv.id, msg.id).catch(() => {});

          // Auto-scroll only if already near bottom; otherwise show "Jump to latest"
          const container = messageContainerRef.current;
          if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 140;
            if (isNearBottom) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 50);
            } else {
              setUnreadNewCount((c) => c + 1);
              setShowJumpButton(true);
            }
          }
        }
      };

      const handleConvUpdated = (data) => {
        setConversations((prev) => {
          const index = prev.findIndex((c) => Number(c.id) === Number(data.conversationId));
          if (index !== -1) {
            const updated = {
              ...prev[index],
              lastMessagePreview: data.lastMessagePreview,
              lastMessageAt: data.lastMessageAt,
              unreadCount: (activeConv && Number(activeConv.id) === Number(data.conversationId)) ? 0 : data.unreadCount
            };
            const copy = [...prev];
            copy.splice(index, 1);
            return [updated, ...copy];
          } else {
            loadConversations();
            return prev;
          }
        });
      };

      const handleReadReceipt = ({ conversationId, userId: readerId }) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (Number(m.conversationId) === Number(conversationId)) {
              const alreadyRead = (m.readReceipts || []).some((r) => Number(r.userId) === Number(readerId));
              if (!alreadyRead) {
                return {
                  ...m,
                  readReceipts: [...(m.readReceipts || []), { userId: readerId, readAt: new Date().toISOString() }]
                };
              }
            }
            return m;
          })
        );
      };

      const handleUserTyping = ({ conversationId, userId: tId, userName }) => {
        if (activeConv && Number(activeConv.id) === Number(conversationId)) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(tId, userName || 'Someone');
            return next;
          });
        }
      };

      const handleUserStopTyping = ({ conversationId, userId: tId }) => {
        if (activeConv && Number(activeConv.id) === Number(conversationId)) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(tId);
            return next;
          });
        }
      };

      const handleMessageEdited = ({ messageId, content }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content, isEdited: true } : m))
        );
      };

      const handleMessageDeleted = ({ messageId }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
          )
        );
      };

      const handleSettingsUpdated = (data) => {
        if (activeConv && Number(activeConv.id) === Number(data.conversationId)) {
          setActiveConv((prev) => ({
            ...prev,
            messagingPermission: data.messagingPermission,
            title: data.title || prev.title,
            imageUrl: data.imageUrl !== undefined ? data.imageUrl : prev.imageUrl
          }));
          if (groupDetails) {
            setGroupDetails((prev) => ({
              ...prev,
              messagingPermission: data.messagingPermission,
              title: data.title || prev.title,
              imageUrl: data.imageUrl !== undefined ? data.imageUrl : prev.imageUrl
            }));
          }
        }
      };

      socket.on('chat:new_message', handleNewMessage);
      socket.on('chat:conversation_updated', handleConvUpdated);
      socket.on('chat:read_receipt', handleReadReceipt);
      socket.on('chat:user_typing', handleUserTyping);
      socket.on('chat:user_stop_typing', handleUserStopTyping);
      socket.on('chat:message_edited', handleMessageEdited);
      socket.on('chat:message_deleted', handleMessageDeleted);
      socket.on('chat:settings_updated', handleSettingsUpdated);

      return () => {
        socket.off('chat:new_message', handleNewMessage);
        socket.off('chat:conversation_updated', handleConvUpdated);
        socket.off('chat:read_receipt', handleReadReceipt);
        socket.off('chat:user_typing', handleUserTyping);
        socket.off('chat:user_stop_typing', handleUserStopTyping);
        socket.off('chat:message_edited', handleMessageEdited);
        socket.off('chat:message_deleted', handleMessageDeleted);
        socket.off('chat:settings_updated', handleSettingsUpdated);
        socket.emit('leave:user', { userId: user.id });
      };
    }
  }, [isAuthenticated, user, activeConv]);

  // 2. Load User Conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConvList(true);
      const list = await chatService.getConversations();
      setConversations(list);
      return list;
    } catch (err) {
      console.error('Failed to load conversations:', err);
      return [];
    } finally {
      setLoadingConvList(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations().then((list) => {
        if (teamParam) {
          chatService.getTeamChat(teamParam).then((conv) => {
            if (conv) selectConversation(conv);
          }).catch(console.error);
        } else if (tournamentParam) {
          chatService.getTournamentChat(tournamentParam).then((conv) => {
            if (conv) selectConversation(conv);
          }).catch(console.error);
        } else if (userParam) {
          chatService.getOrCreateDirectChat(userParam).then((conv) => {
            if (conv) selectConversation(conv);
          }).catch(console.error);
        } else if (initialConvId && list && list.length > 0) {
          const match = list.find((c) => String(c.id) === String(initialConvId) || c.uuid === initialConvId);
          if (match) selectConversation(match);
        } else if (list && list.length > 0 && !activeConv && typeof window !== 'undefined' && window.innerWidth > 768) {
          selectConversation(list[0]);
        }
      });
    }
  }, [isAuthenticated, loadConversations]);

  // 3. Select Conversation & Join Socket Room
  const selectConversation = async (conv) => {
    if (!conv) return;

    if (activeConv && socketRef.current) {
      socketRef.current.emit('leave:chat_conversation', { conversationId: activeConv.id });
      socketRef.current.emit('leave:chat_conversation', { conversationId: activeConv.uuid });
    }

    setActiveConv(conv);
    setTypingUsers(new Map());
    setReplyingTo(null);
    setEditingMessage(null);
    setShowGroupInfo(false);
    setShowJumpButton(false);
    setUnreadNewCount(0);

    if (socketRef.current) {
      socketRef.current.emit('join:chat_conversation', { conversationId: conv.id });
      socketRef.current.emit('join:chat_conversation', { conversationId: conv.uuid });
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    try {
      setLoadingMessages(true);
      const [msgData, details] = await Promise.all([
        chatService.getMessages(conv.id),
        chatService.getConversationDetails(conv.id).catch(() => null)
      ]);
      setMessages(msgData.items || []);
      if (details) {
        setGroupDetails(details);
        setActiveConv((current) => ({
          ...current,
          role: details.role,
          messagingPermission: details.messagingPermission,
          participants: details.participants
        }));
      }
      chatService.markAsRead(conv.id).catch(() => {});
      // Scroll to bottom immediately on conversation switch
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Scroll handler for Jump to Latest
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isBottom = scrollHeight - scrollTop - clientHeight < 140;
    setShowJumpButton(!isBottom);
    if (isBottom) {
      setUnreadNewCount(0);
    }
  };

  const jumpToLatest = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowJumpButton(false);
    setUnreadNewCount(0);
  };

  // Handle typing debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Auto-grow textarea up to 120px
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (activeConv && socketRef.current && user) {
      socketRef.current.emit('chat:typing', {
        conversationId: activeConv.id,
        userId: user.id,
        userName: user.fullName || user.full_name || 'Member'
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('chat:stop_typing', {
          conversationId: activeConv.id,
          userId: user.id
        });
      }, 2500);
    }
  };

  // Keydown: Enter sends, Shift+Enter adds newline
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Attachment handler
  const handleAttachmentSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedAttachments((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setAttachmentPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeAttachment = (index) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
    setAttachmentPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // 4. Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && selectedAttachments.length === 0) || !activeConv) return;

    const textToSend = inputText.trim();
    const attachmentsToSend = [...selectedAttachments];
    const replyId = replyingTo?.id || null;

    setInputText('');
    setSelectedAttachments([]);
    setAttachmentPreviews([]);
    setReplyingTo(null);

    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
    }

    if (socketRef.current && activeConv) {
      socketRef.current.emit('chat:stop_typing', {
        conversationId: activeConv.id,
        userId: user.id
      });
    }

    try {
      if (attachmentsToSend.length > 0) {
        const formData = new FormData();
        formData.append('content', textToSend);
        if (replyId) formData.append('replyToMessageId', replyId);
        attachmentsToSend.forEach((f) => {
          formData.append('attachments', f);
        });
        await chatService.sendMessage(activeConv.id, formData);
      } else {
        await chatService.sendMessage(activeConv.id, {
          content: textToSend,
          messageType: 'TEXT',
          replyToMessageId: replyId
        });
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // 5. Edit Message Submit
  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await chatService.editMessage(editingMessage.id, editText.trim());
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to edit message');
    }
  };

  // 6. Delete Message
  const handleDeleteMessage = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await chatService.deleteMessage(msgId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete message');
    }
  };

  // 7. Group Settings Toggle (Everyone vs Admins Only)
  const handleToggleMessagingPermission = async (newSetting) => {
    if (!activeConv) return;
    try {
      const updated = await chatService.updateGroupSettings(activeConv.id, {
        messagingPermission: newSetting
      });
      setActiveConv((prev) => ({ ...prev, messagingPermission: updated.messagingPermission }));
      if (groupDetails) {
        setGroupDetails((prev) => ({ ...prev, messagingPermission: updated.messagingPermission }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change settings');
    }
  };

  // 8. User Search for Direct Chat
  const handleSearchUsers = async (query) => {
    setUserSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const items = await chatService.searchUsers(query);
      setSearchedUsers(items);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartDirectChat = async (targetUser) => {
    try {
      const conv = await chatService.getOrCreateDirectChat(targetUser.id);
      setIsNewChatModalOpen(false);
      setUserSearchQuery('');
      setSearchedUsers([]);
      await loadConversations();
      selectConversation(conv);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start chat');
    }
  };

  // 9. Member Management
  const handleSearchAddMembers = async (query) => {
    setMemberSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchedAddMembers([]);
      return;
    }
    try {
      const items = await chatService.searchUsers(query);
      setSearchedAddMembers(items);
    } catch (err) {}
  };

  const handleAddExternalMember = async (targetUser) => {
    if (!activeConv) return;
    try {
      await chatService.addMember(activeConv.id, targetUser.id);
      setIsAddMemberModalOpen(false);
      setMemberSearchQuery('');
      setSearchedAddMembers([]);
      const details = await chatService.getConversationDetails(activeConv.id);
      setGroupDetails(details);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!activeConv || !confirm('Remove this member from group chat?')) return;
    try {
      await chatService.removeMember(activeConv.id, targetUserId);
      const details = await chatService.getConversationDetails(activeConv.id);
      setGroupDetails(details);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!activeConv) return;
    try {
      await chatService.updateMemberRole(activeConv.id, targetUserId, newRole);
      const details = await chatService.getConversationDetails(activeConv.id);
      setGroupDetails(details);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === 'TEAMS' && c.type !== 'TEAM') return false;
      if (activeFilter === 'TOURNAMENTS' && c.type !== 'TOURNAMENT') return false;
      if (activeFilter === 'DIRECT' && c.type !== 'DIRECT') return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const titleMatch = (c.title || '').toLowerCase().includes(term);
        const previewMatch = (c.lastMessagePreview || '').toLowerCase().includes(term);
        return titleMatch || previewMatch;
      }
      return true;
    });
  }, [conversations, activeFilter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => ({
    all: conversations.length,
    teams: conversations.filter((c) => c.type === 'TEAM').length,
    tournaments: conversations.filter((c) => c.type === 'TOURNAMENT').length,
    direct: conversations.filter((c) => c.type === 'DIRECT').length
  }), [conversations]);

  const isUserAdminOrOwner = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
    if (activeConv?.role === 'ADMIN' || activeConv?.role === 'OWNER') return true;
    if (groupDetails?.role === 'ADMIN' || groupDetails?.role === 'OWNER') return true;
    return false;
  }, [user, activeConv, groupDetails]);

  const isMessagingRestricted = activeConv?.messagingPermission === 'ADMINS_ONLY' && !isUserAdminOrOwner;

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 65px)',
        background: isLight ? '#f8fafc' : '#090d16',
        color: isLight ? '#0f172a' : '#f8fafc',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* ──────────────── Left Panel: Conversation List ──────────────── */}
      <div
        style={{
          width: isMobileView ? (activeConv ? '0%' : '100%') : '360px',
          minWidth: isMobileView ? '0' : '320px',
          maxWidth: isMobileView ? '100%' : '400px',
          borderRight: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
          background: isLight ? '#ffffff' : '#0f172a',
          display: isMobileView && activeConv ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0
        }}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: '1rem 1.15rem',
            borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isLight ? '#f8fafc' : '#111827'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '9px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(132, 204, 22, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.35)'
              }}
            >
              <MessageSquare size={18} color="#10b981" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: isLight ? '#0f172a' : '#ffffff' }}>
                Chats
              </h2>
              <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 700
            }}
          >
            + New Chat
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isLight ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '20px',
              padding: '0.4rem 0.85rem'
            }}
          >
            <Search size={15} style={{ color: isLight ? '#64748b' : '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search chats or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: isLight ? '#0f172a' : '#ffffff',
                fontSize: '0.82rem',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            padding: '0.65rem 1rem',
            overflowX: 'auto',
            borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'}`
          }}
        >
          {[
            { id: 'ALL', label: `All (${counts.all})` },
            { id: 'TEAMS', label: `Teams (${counts.teams})` },
            { id: 'TOURNAMENTS', label: `Tournaments (${counts.tournaments})` },
            { id: 'DIRECT', label: `Direct (${counts.direct})` }
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : (isLight ? '#f1f5f9' : '#1e293b'),
                  color: isActive ? '#ffffff' : (isLight ? '#475569' : '#94a3b8'),
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conversations Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {loadingConvList ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '12px', background: isLight ? '#e2e8f0' : '#1e293b' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, width: '65%', borderRadius: 4, background: isLight ? '#e2e8f0' : '#1e293b', marginBottom: 6 }} />
                    <div style={{ height: 10, width: '45%', borderRadius: 4, background: isLight ? '#f1f5f9' : '#162032' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: isLight ? '#64748b' : '#94a3b8' }}>
              <MessageSquare size={32} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>No conversations found</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {searchQuery ? 'Try adjusting your search terms' : 'Click "+ New Chat" to start messaging players or teammates.'}
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConv && Number(activeConv.id) === Number(conv.id);
              const unread = Number(conv.unreadCount || 0);

              // Distinctive Subtitle Identifier for Duplicate Names (Tournaments & Teams)
              const subtitleIdentifier =
                conv.type === 'TOURNAMENT' && (conv.tournamentId || conv.tournament_id)
                  ? `Tournament #${conv.tournamentId || conv.tournament_id}`
                  : conv.type === 'TEAM' && (conv.teamId || conv.team_id)
                  ? `Team #${conv.teamId || conv.team_id}`
                  : null;

              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    background: isSelected
                      ? (isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.16)')
                      : 'transparent',
                    borderLeft: isSelected ? '3px solid #10b981' : '3px solid transparent',
                    borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Avatar with Error Fallback */}
                  <ChatAvatar
                    imageUrl={conv.imageUrl}
                    title={conv.title}
                    type={conv.type}
                    size={42}
                  />

                  {/* Conversation Meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span
                        style={{
                          fontSize: '0.86rem',
                          fontWeight: unread > 0 ? 800 : 700,
                          color: isLight ? '#0f172a' : '#ffffff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {conv.title}
                      </span>
                      {conv.lastMessageAt && (
                        <span style={{ fontSize: '0.68rem', color: unread > 0 ? '#10b981' : (isLight ? '#64748b' : '#94a3b8'), fontWeight: unread > 0 ? 800 : 500, flexShrink: 0 }}>
                          {formatMessageTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {/* Type Badge */}
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: conv.type === 'TEAM'
                              ? 'rgba(16, 185, 129, 0.18)'
                              : conv.type === 'TOURNAMENT'
                              ? 'rgba(139, 92, 246, 0.18)'
                              : 'rgba(59, 130, 246, 0.18)',
                            color: conv.type === 'TEAM'
                              ? '#10b981'
                              : conv.type === 'TOURNAMENT'
                              ? '#a78bfa'
                              : '#60a5fa',
                            flexShrink: 0
                          }}
                        >
                          {conv.type}
                        </span>

                        {/* Distinct Identifier Pill if Present */}
                        {subtitleIdentifier && (
                          <span style={{ fontSize: '0.62rem', color: isLight ? '#64748b' : '#94a3b8', background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: '4px' }}>
                            {subtitleIdentifier}
                          </span>
                        )}

                        {/* Preview Text */}
                        <span
                          style={{
                            fontSize: '0.76rem',
                            color: unread > 0 ? (isLight ? '#0f172a' : '#f8fafc') : (isLight ? '#64748b' : '#94a3b8'),
                            fontWeight: unread > 0 ? 700 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {conv.lastMessagePreview || 'No messages yet'}
                        </span>
                      </div>

                      {/* Unread Badge */}
                      {unread > 0 && (
                        <span
                          style={{
                            background: '#10b981',
                            color: '#ffffff',
                            borderRadius: '12px',
                            padding: '0.1rem 0.45rem',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ──────────────── Right Panel: Active Conversation View ──────────────── */}
      <div
        style={{
          flex: 1,
          display: isMobileView && !activeConv ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          background: isLight ? '#ffffff' : '#0b1120',
          position: 'relative',
          minWidth: 0
        }}
      >
        {activeConv ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                background: isLight ? '#f8fafc' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Mobile Back Button */}
                <button
                  onClick={() => setActiveConv(null)}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '0.35rem',
                    borderRadius: '8px',
                    display: isMobileView ? 'flex' : 'none',
                    color: isLight ? '#0f172a' : '#ffffff'
                  }}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={19} />
                </button>

                {/* Avatar */}
                <ChatAvatar
                  imageUrl={activeConv.imageUrl}
                  title={activeConv.title}
                  type={activeConv.type}
                  size={40}
                />

                {/* Title & Metadata */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <h3
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        margin: 0,
                        color: isLight ? '#0f172a' : '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeConv.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: activeConv.type === 'TEAM'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : activeConv.type === 'TOURNAMENT'
                          ? 'rgba(139, 92, 246, 0.2)'
                          : 'rgba(59, 130, 246, 0.2)',
                        color: activeConv.type === 'TEAM'
                          ? '#10b981'
                          : activeConv.type === 'TOURNAMENT'
                          ? '#a78bfa'
                          : '#60a5fa'
                      }}
                    >
                      {activeConv.type}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
                    {activeConv.type === 'DIRECT'
                      ? (activeConv.otherUser?.status || 'Direct Message')
                      : `${groupDetails?.participants?.length || 'Group'} participants`}
                  </span>
                </div>
              </div>

              {/* Header Right Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeConv.type !== 'DIRECT' && (
                  <button
                    onClick={() => setShowGroupInfo(!showGroupInfo)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}
                  >
                    <Users size={15} />
                    <span>Group Info</span>
                  </button>
                )}
              </div>
            </div>

            {/* Messaging Restriction Notice Banner */}
            {activeConv.messagingPermission === 'ADMINS_ONLY' && (
              <div
                style={{
                  background: isLight ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                  borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: '0.45rem 1rem',
                  fontSize: '0.76rem',
                  color: isLight ? '#b45309' : '#fde047',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600
                }}
              >
                <Lock size={13} style={{ flexShrink: 0 }} />
                <span>Only group admins can send messages. Others have view-only access.</span>
              </div>
            )}

            {/* Message Stream */}
            <div
              ref={messageContainerRef}
              onScroll={handleScroll}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                background: isLight ? '#f8fafc' : '#0b1120'
              }}
            >
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: isLight ? '#64748b' : '#94a3b8' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem' }}>Loading conversation history...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                  <MessageSquare size={36} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>No messages in this chat yet</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>Say hello and start the conversation!</div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = Number(msg.senderId) === Number(user?.id);
                  const prevMsg = messages[index - 1];

                  // Date separator check
                  const showDateSeparator =
                    !prevMsg ||
                    formatDateSeparator(prevMsg.createdAt) !== formatDateSeparator(msg.createdAt);

                  // Group consecutive messages from same sender within 5 mins
                  const isSameSenderAsPrev =
                    prevMsg &&
                    String(prevMsg.senderId) === String(msg.senderId) &&
                    new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 5 * 60 * 1000 &&
                    !prevMsg.isSystem &&
                    !msg.isSystem;

                  // System Announcement Message
                  if (msg.isSystem || msg.messageType === 'SYSTEM') {
                    return (
                      <React.Fragment key={msg.id || msg.uuid || index}>
                        {showDateSeparator && (
                          <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                            <span
                              style={{
                                background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
                                color: isLight ? '#475569' : '#94a3b8',
                                padding: '3px 12px',
                                borderRadius: '12px',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}
                            >
                              {formatDateSeparator(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div style={{ textAlign: 'center', margin: '0.35rem 0' }}>
                          <span
                            style={{
                              background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)',
                              color: isLight ? '#475569' : '#94a3b8',
                              padding: '4px 14px',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              display: 'inline-block'
                            }}
                          >
                            {msg.content}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  }

                  const senderColor = getSenderColor(msg.senderName || msg.senderId);

                  return (
                    <React.Fragment key={msg.id || msg.uuid || index}>
                      {showDateSeparator && (
                        <div style={{ textAlign: 'center', margin: '0.85rem 0 0.5rem' }}>
                          <span
                            style={{
                              background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
                              color: isLight ? '#475569' : '#94a3b8',
                              padding: '3px 12px',
                              borderRadius: '12px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}
                          >
                            {formatDateSeparator(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                        style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          marginTop: isSameSenderAsPrev ? '2px' : '8px',
                          position: 'relative'
                        }}
                      >
                        {/* Bubble Container */}
                        <div
                          style={{
                            maxWidth: isMobileView ? '85%' : '72%',
                            minWidth: '100px',
                            background: isOwn
                              ? (isLight ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #065f46 0%, #047857 100%)')
                              : (isLight ? '#ffffff' : '#1e293b'),
                            color: isOwn ? '#ffffff' : (isLight ? '#0f172a' : '#f8fafc'),
                            border: isOwn
                              ? 'none'
                              : (isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)'),
                            borderRadius: isSameSenderAsPrev
                              ? '14px'
                              : isOwn
                              ? '16px 16px 4px 16px'
                              : '16px 16px 16px 4px',
                            padding: '0.55rem 0.8rem',
                            position: 'relative',
                            boxShadow: isLight
                              ? '0 1px 3px rgba(0,0,0,0.06)'
                              : '0 2px 8px rgba(0,0,0,0.25)'
                          }}
                        >
                          {/* Sender Name in Group Chats (shown only on first of cluster) */}
                          {!isOwn && !isSameSenderAsPrev && activeConv.type !== 'DIRECT' && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: senderColor,
                                marginBottom: '0.25rem'
                              }}
                            >
                              {msg.senderName}
                            </div>
                          )}

                          {/* Quoted Reply Box */}
                          {msg.replyTo && (
                            <div
                              style={{
                                background: isOwn ? 'rgba(0,0,0,0.2)' : (isLight ? '#f1f5f9' : 'rgba(0,0,0,0.3)'),
                                borderLeft: `3px solid ${isOwn ? '#a7f3d0' : '#10b981'}`,
                                borderRadius: '4px',
                                padding: '0.3rem 0.5rem',
                                marginBottom: '0.4rem',
                                fontSize: '0.76rem'
                              }}
                            >
                              <div style={{ fontWeight: 800, color: isOwn ? '#d1fae5' : '#10b981', fontSize: '0.7rem' }}>
                                {msg.replyTo.senderName || 'Member'}
                              </div>
                              <div style={{ color: isOwn ? '#f0fdf4' : (isLight ? '#475569' : '#cbd5e1'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {msg.replyTo.content || 'Photo'}
                              </div>
                            </div>
                          )}

                          {/* Image Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.35rem' }}>
                              {msg.attachments.map((att) => (
                                <img
                                  key={att.id || att.fileUrl}
                                  src={att.fileUrl}
                                  alt=""
                                  onClick={() => setLightboxImage(att.fileUrl)}
                                  style={{
                                    maxWidth: '300px',
                                    maxHeight: '240px',
                                    width: '100%',
                                    borderRadius: '10px',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    display: 'block'
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Message Text Content */}
                          {msg.content && (
                            <div
                              style={{
                                fontSize: '0.88rem',
                                lineHeight: 1.42,
                                wordBreak: 'break-word',
                                fontStyle: msg.isDeleted ? 'italic' : 'normal',
                                color: msg.isDeleted
                                  ? (isOwn ? '#a7f3d0' : (isLight ? '#64748b' : '#94a3b8'))
                                  : (isOwn ? '#ffffff' : (isLight ? '#0f172a' : '#f8fafc'))
                              }}
                            >
                              {msg.content}
                            </div>
                          )}

                          {/* Timestamp & Status Ticks */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '0.3rem',
                              marginTop: '0.25rem',
                              fontSize: '0.65rem',
                              color: isOwn ? '#a7f3d0' : (isLight ? '#64748b' : '#94a3b8')
                            }}
                          >
                            {msg.isEdited && <span>edited</span>}
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isOwn && (
                              <CheckCheck size={13} style={{ color: '#a7f3d0' }} />
                            )}
                          </div>

                          {/* Hover Action Toolbar */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              right: isOwn ? 'auto' : '8px',
                              left: isOwn ? '8px' : 'auto',
                              display: hoveredMsgId === msg.id ? 'flex' : 'none',
                              alignItems: 'center',
                              gap: '2px',
                              background: isLight ? '#ffffff' : '#0f172a',
                              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.15)'}`,
                              borderRadius: '16px',
                              padding: '2px 5px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                              zIndex: 10
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              title="Reply"
                              style={{ background: 'transparent', border: 'none', color: isLight ? '#475569' : '#94a3b8', padding: '3px', cursor: 'pointer', display: 'flex' }}
                            >
                              <CornerUpLeft size={13} />
                            </button>
                            {isOwn && !msg.isDeleted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setEditText(msg.content);
                                }}
                                title="Edit"
                                style={{ background: 'transparent', border: 'none', color: isLight ? '#475569' : '#94a3b8', padding: '3px', cursor: 'pointer', display: 'flex' }}
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {(isOwn || isUserAdminOrOwner) && !msg.isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete"
                                style={{ background: 'transparent', border: 'none', color: '#f87171', padding: '3px', cursor: 'pointer', display: 'flex' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {/* Typing indicators */}
              {typingUsers.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#10b981', fontStyle: 'italic', padding: '0.2rem 0.5rem' }}>
                  <span>
                    {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Jump to Latest Floating Button */}
            {showJumpButton && (
              <button
                type="button"
                onClick={jumpToLatest}
                style={{
                  position: 'absolute',
                  bottom: '80px',
                  right: '24px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  zIndex: 20
                }}
              >
                <ArrowDown size={14} />
                <span>Jump to latest</span>
                {unreadNewCount > 0 && (
                  <span style={{ background: '#ffffff', color: '#059669', borderRadius: '10px', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 900 }}>
                    {unreadNewCount}
                  </span>
                )}
              </button>
            )}

            {/* Edit Message Banner */}
            {editingMessage && (
              <div
                style={{
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  padding: '0.5rem 1rem',
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <Edit2 size={15} color="#10b981" />
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      flex: 1,
                      background: isLight ? '#ffffff' : '#0f172a',
                      border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'}`,
                      color: isLight ? '#0f172a' : '#ffffff',
                      borderRadius: '6px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button onClick={handleSaveEdit} className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Save</button>
                  <button onClick={() => setEditingMessage(null)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Reply Banner */}
            {replyingTo && (
              <div
                style={{
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  padding: '0.5rem 1rem',
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '0.5rem', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 800, color: '#10b981' }}>Replying to {replyingTo.senderName}</div>
                  <div style={{ color: isLight ? '#64748b' : '#94a3b8', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {replyingTo.content || 'Photo'}
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Attachment Previews */}
            {attachmentPreviews.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: isLight ? '#f8fafc' : '#111827',
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`
                }}
              >
                {attachmentPreviews.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: 56, height: 56, borderRadius: '8px', objectFit: 'cover' }} />
                    <button
                      onClick={() => removeAttachment(i)}
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 900
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Composer */}
            {isMessagingRestricted ? (
              <div
                style={{
                  padding: '1.1rem',
                  background: isLight ? '#f8fafc' : '#0f172a',
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  textAlign: 'center',
                  color: isLight ? '#64748b' : '#94a3b8',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 600
                }}
              >
                <Lock size={16} color="#f59e0b" />
                <span>Only admins can send messages in this group.</span>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`,
                  background: isLight ? '#ffffff' : '#0f172a',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '0.65rem',
                  flexShrink: 0
                }}
              >
                {/* Attach File Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleAttachmentSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.5rem', borderRadius: '10px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Attach images"
                >
                  <ImageIcon size={18} />
                </button>

                {/* Auto-growing Textarea */}
                <textarea
                  ref={messageInputRef}
                  rows={1}
                  placeholder="Type a message (Enter to send, Shift+Enter for new line)..."
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  style={{
                    flex: 1,
                    background: isLight ? '#f1f5f9' : '#1e293b',
                    border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: '20px',
                    padding: '0.6rem 1rem',
                    color: isLight ? '#0f172a' : '#ffffff',
                    outline: 'none',
                    fontSize: '0.88rem',
                    resize: 'none',
                    maxHeight: '120px',
                    lineHeight: 1.4
                  }}
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputText.trim() && selectedAttachments.length === 0}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    background: (!inputText.trim() && selectedAttachments.length === 0)
                      ? (isLight ? '#cbd5e1' : '#334155')
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (!inputText.trim() && selectedAttachments.length === 0) ? 'not-allowed' : 'pointer',
                    boxShadow: (!inputText.trim() && selectedAttachments.length === 0) ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: isLight ? '#64748b' : '#94a3b8' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(132, 204, 22, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                border: '1.5px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <MessageSquare size={32} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.35rem', color: isLight ? '#0f172a' : '#ffffff' }}>
              TurfSpot Sports Chat
            </h3>
            <p style={{ maxWidth: '340px', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Select a conversation from the list to view team announcements, coordinate matches, or message players directly.
            </p>
          </div>
        )}
      </div>

      {/* ──────────────── Lightbox Preview Modal ──────────────── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'zoom-out'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Close image"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              borderRadius: '12px',
              objectFit: 'contain',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
          />
        </div>
      )}

      {/* ──────────────── New Chat Modal ──────────────── */}
      {isNewChatModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '420px',
              maxWidth: '92vw',
              background: isLight ? '#ffffff' : '#0f172a',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff' }}>
                New Direct Conversation
              </h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.3rem', color: isLight ? '#64748b' : '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px',
                  padding: '0.5rem 0.75rem'
                }}
              >
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search player by name, phone or username..."
                  value={userSearchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontSize: '0.86rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {searchingUsers ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Searching players...
                </div>
              ) : searchedUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: isLight ? '#64748b' : '#94a3b8', fontSize: '0.82rem' }}>
                  {userSearchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No players found matching your query'}
                </div>
              ) : (
                searchedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartDirectChat(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? '#f1f5f9' : '#1e293b')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <ChatAvatar
                      imageUrl={u.profilePhoto || u.photoThumbnail}
                      title={u.fullName || u.full_name}
                      type="DIRECT"
                      size={36}
                    />
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff' }}>
                        {u.fullName || u.full_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                        {u.username ? `@${u.username}` : (u.phone || 'Player')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── Group Info Modal ──────────────── */}
      {showGroupInfo && groupDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '460px',
              maxWidth: '92vw',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: isLight ? '#ffffff' : '#0f172a',
              border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: isLight ? '#0f172a' : '#ffffff' }}>
                Group Information
              </h3>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.3rem', color: isLight ? '#64748b' : '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Group Header Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <ChatAvatar
                imageUrl={groupDetails.imageUrl}
                title={groupDetails.title}
                type={groupDetails.type}
                size={54}
              />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                  {groupDetails.title}
                </h4>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700 }}>
                  {groupDetails.participants?.length || 0} participants • {groupDetails.type}
                </span>
              </div>
            </div>

            {/* Messaging Permission Setting (Admin only) */}
            {isUserAdminOrOwner && (
              <div
                style={{
                  background: isLight ? '#f1f5f9' : '#1e293b',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  marginBottom: '1.25rem',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'}`
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Shield size={14} color="#10b981" />
                  <span>Send Messages Permission</span>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleMessagingPermission('EVERYONE')}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: groupDetails.messagingPermission === 'EVERYONE' ? '#10b981' : (isLight ? '#e2e8f0' : '#334155'),
                      color: groupDetails.messagingPermission === 'EVERYONE' ? '#ffffff' : (isLight ? '#475569' : '#94a3b8')
                    }}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMessagingPermission('ADMINS_ONLY')}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: groupDetails.messagingPermission === 'ADMINS_ONLY' ? '#f59e0b' : (isLight ? '#e2e8f0' : '#334155'),
                      color: groupDetails.messagingPermission === 'ADMINS_ONLY' ? '#ffffff' : (isLight ? '#475569' : '#94a3b8')
                    }}
                  >
                    Admins Only
                  </button>
                </div>
              </div>
            )}

            {/* Participants List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>
                  Participants ({groupDetails.participants?.length || 0})
                </span>
                {isUserAdminOrOwner && (
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="btn btn-ghost btn-xs"
                    style={{ color: '#10b981', fontWeight: 700, fontSize: '0.74rem' }}
                  >
                    + Add Member
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(groupDetails.participants || []).map((p) => (
                  <div
                    key={p.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      background: isLight ? '#f8fafc' : '#1e293b'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <ChatAvatar
                        imageUrl={p.profilePhoto || p.photoThumbnail}
                        title={p.fullName}
                        type="DIRECT"
                        size={32}
                      />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff' }}>
                          {p.fullName}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                          {p.role || 'Member'}
                        </div>
                      </div>
                    </div>

                    {isUserAdminOrOwner && Number(p.userId) !== Number(user?.id) && (
                      <button
                        onClick={() => handleRemoveMember(p.userId)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                        title="Remove member"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
