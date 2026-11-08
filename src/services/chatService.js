import API from './api';

const chatService = {
  getConversations: async () => {
    try {
      const res = await API.get('/chat/conversations');
      return res.data?.data?.items || [];
    } catch (err) {
      console.warn('Failed to load conversations:', err?.message);
      return [];
    }
  },

  getTotalUnread: async () => {
    try {
      const res = await API.get('/chat/unread-count');
      return res.data?.data?.totalUnread || 0;
    } catch (err) {
      console.warn('Failed to load unread count:', err?.message);
      return 0;
    }
  },

  getConversationDetails: async (id) => {
    const res = await API.get(`/chat/conversations/${id}`);
    return res.data?.data;
  },

  getMessages: async (id, { cursor = null, limit = 40 } = {}) => {
    const params = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;
    const res = await API.get(`/chat/conversations/${id}/messages`, { params });
    return res.data?.data || { items: [], nextCursor: null };
  },

  sendMessage: async (id, payload) => {
    // If FormData (with attachments)
    if (payload instanceof FormData) {
      const res = await API.post(`/chat/conversations/${id}/messages`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data?.data;
    }
    const res = await API.post(`/chat/conversations/${id}/messages`, payload);
    return res.data?.data;
  },

  markAsRead: async (id, messageId = null) => {
    const res = await API.post(`/chat/conversations/${id}/read`, { messageId });
    return res.data;
  },

  getOrCreateDirectChat: async (targetUserId) => {
    const id = typeof targetUserId === 'object' && targetUserId !== null
      ? Number(targetUserId.id || targetUserId.userId || targetUserId.targetUserId)
      : Number(targetUserId);
    const res = await API.post('/chat/direct', { targetUserId: id });
    return res.data?.data;
  },

  getTeamChat: async (teamId) => {
    const res = await API.get(`/chat/team/${teamId}`);
    return res.data?.data;
  },

  getTournamentChat: async (tournamentId) => {
    const res = await API.get(`/chat/tournament/${tournamentId}`);
    return res.data?.data;
  },

  updateGroupSettings: async (id, data) => {
    const res = await API.patch(`/chat/conversations/${id}/settings`, data);
    return res.data?.data;
  },

  addMember: async (id, targetUserId) => {
    const res = await API.post(`/chat/conversations/${id}/members`, { targetUserId });
    return res.data;
  },

  removeMember: async (id, targetUserId) => {
    const res = await API.delete(`/chat/conversations/${id}/members/${targetUserId}`);
    return res.data;
  },

  updateMemberRole: async (id, targetUserId, role) => {
    const res = await API.patch(`/chat/conversations/${id}/members/${targetUserId}/role`, { role });
    return res.data;
  },

  deleteMessage: async (messageId) => {
    const res = await API.delete(`/chat/messages/${messageId}`);
    return res.data;
  },

  editMessage: async (messageId, content) => {
    const res = await API.patch(`/chat/messages/${messageId}`, { content });
    return res.data;
  },

  searchUsers: async (query) => {
    const res = await API.get('/chat/users/search', { params: { q: query } });
    return res.data?.data?.items || [];
  }
};

export default chatService;

