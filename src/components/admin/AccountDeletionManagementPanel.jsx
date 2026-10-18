'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Trash2, ShieldAlert, RotateCcw, Search, Filter,
  CheckCircle2, AlertTriangle, Clock, UserX, Loader2, Eye, Shield
} from 'lucide-react';

export default function AccountDeletionManagementPanel() {
  const [users, setUsers] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('REQUESTS'); // 'REQUESTS' | 'AUDITS'

  // Permanent Deletion Modal State
  const [targetUser, setTargetUser] = useState(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [permReason, setPermReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMsg, setActionMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const fetchDeletionData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, auditRes] = await Promise.all([
        axios.get(`/api/admin/account-deletions?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`, config),
        axios.get('/api/admin/account-deletions/audits', config)
      ]);

      if (reqRes.data.success) {
        setUsers(reqRes.data.data.users || []);
      }
      if (auditRes.data.success) {
        setAudits(auditRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load deletion management data:', err);
      setActionMsg({ type: 'error', text: 'Failed to load deletion requests.' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchDeletionData();
  }, [fetchDeletionData]);

  const handleRestore = async (userId, username) => {
    if (!window.confirm(`Restore account @${username} back to ACTIVE status?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`/api/admin/account-deletions/${userId}/restore`, {}, config);
      if (res.data.success) {
        setActionMsg({ type: 'success', text: res.data.message });
        fetchDeletionData();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to restore account.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePermanentDelete = async () => {
    if (confirmPhrase !== 'DELETE PERMANENTLY') {
      setActionMsg({ type: 'error', text: 'You must type "DELETE PERMANENTLY" exactly to proceed.' });
      return;
    }

    try {
      setIsDeleting(true);
      setActionMsg(null);
      const res = await axios.post(`/api/admin/account-deletions/${targetUser.id}/permanent-delete`, {
        confirmPhrase,
        reason: permReason || 'Permanent deletion confirmed by Super Admin'
      }, config);

      if (res.data.success) {
        setActionMsg({ type: 'success', text: res.data.message });
        setTargetUser(null);
        setConfirmPhrase('');
        setPermReason('');
        fetchDeletionData();
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err?.response?.data?.message || 'Permanent deletion failed.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 14,
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.5px' }}>
            User Data Rights &amp; Google Play Store Administration
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.2rem 0', color: 'var(--text-heading)' }}>
            Account Deletion Requests &amp; Permanent Deletion
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Super Admin-only authorization to review deactivations, restore accounts, or execute permanent PII anonymization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveView('REQUESTS')}
            className={`btn btn-sm ${activeView === 'REQUESTS' ? 'btn-primary' : 'btn-outline'}`}
          >
            Deletion Requests ({users.length})
          </button>
          <button
            onClick={() => setActiveView('AUDITS')}
            className={`btn btn-sm ${activeView === 'AUDITS' ? 'btn-primary' : 'btn-outline'}`}
          >
            Audit Trail ({audits.length})
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 8,
            fontSize: '0.85rem',
            background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: actionMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: actionMsg.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {actionMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {actionMsg.text}
        </div>
      )}

      {activeView === 'REQUESTS' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 14 }}>
          {/* Filter Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'SOFT_DELETED', 'PENDING_DELETION', 'PERMANENTLY_DELETED', 'ACTIVE'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className="btn btn-sm"
                  style={{
                    background: filterStatus === st ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                    color: filterStatus === st ? '#fff' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                placeholder="Search by ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.82rem' }}
              />
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 780 }}>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>User Name</th>
                  <th>Contact Email / Phone</th>
                  <th>Role</th>
                  <th>Deletion Status</th>
                  <th>Requested Date</th>
                  <th>Permanent Deletion Date</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 800 }}>#{u.id}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </td>
                      <td>
                        <div>{u.email}</div>
                        {u.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                      </td>
                      <td>
                        <span className="badge badge-info">{u.role}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.deletionStatus === 'SOFT_DELETED'
                              ? 'badge-warning'
                              : u.deletionStatus === 'PERMANENTLY_DELETED'
                              ? 'badge-danger'
                              : 'badge-success'
                          }`}
                        >
                          {u.deletionStatus}
                        </span>
                      </td>
                      <td>{u.deletionRequestedAt ? new Date(u.deletionRequestedAt).toLocaleDateString() : (u.deletedAt ? new Date(u.deletedAt).toLocaleDateString() : '-')}</td>
                      <td>
                        {u.scheduledPermanentDeletionAt ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            {new Date(u.scheduledPermanentDeletionAt).toLocaleDateString()}
                          </span>
                        ) : u.deletionStatus === 'PERMANENTLY_DELETED' ? (
                          <span style={{ color: '#ef4444' }}>Executed</span>
                        ) : '-'}
                      </td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {u.deletionReason || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {u.deletionStatus !== 'PERMANENTLY_DELETED' && (
                            <>
                              <button
                                onClick={() => handleRestore(u.id, u.username)}
                                className="btn btn-sm btn-outline"
                                title="Restore user to ACTIVE"
                              >
                                <RotateCcw size={13} /> Restore
                              </button>
                              <button
                                onClick={() => {
                                  setTargetUser(u);
                                  setConfirmPhrase('');
                                  setPermReason('');
                                }}
                                className="btn btn-sm btn-primary"
                                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                title="Permanently delete user and scrub personal data"
                              >
                                <Trash2 size={13} /> Permanent Delete
                              </button>
                            </>
                          )}
                          {u.deletionStatus === 'PERMANENTLY_DELETED' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                              Anonymized
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No matching account deletion requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG VIEW ── */}
      {activeView === 'AUDITS' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 14 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Account Deletion Audit Trail</h3>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Action</th>
                  <th>User Identifier</th>
                  <th>Executor</th>
                  <th>Timestamp</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 800 }}>#{a.id}</td>
                    <td>
                      <span className={`badge ${a.actionType === 'PERMANENT_DELETE' ? 'badge-danger' : a.actionType === 'SOFT_DELETE' ? 'badge-warning' : 'badge-success'}`}>
                        {a.actionType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.userIdentifier}</td>
                    <td>{a.executedByName || 'User Self / System'}</td>
                    <td>{new Date(a.createdAt).toLocaleString()}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {a.details ? JSON.stringify(a.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Irreversible Permanent Deletion Confirmation ── */}
      {targetUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
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
              maxWidth: 520,
              padding: '1.75rem',
              borderRadius: 16,
              border: '2px solid #ef4444',
              background: '#0f172a'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444', marginBottom: '0.85rem' }}>
              <ShieldAlert size={26} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>
                PERMANENT ACCOUNT DELETION
              </h3>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.85rem', borderRadius: 8, fontSize: '0.85rem', color: '#f87171', marginBottom: '1rem', lineHeight: '1.5' }}>
              <strong>WARNING:</strong> This action is strictly <strong>IRREVERSIBLE</strong>. All personal identifiers (name, email, phone, photos, residential addresses) for user <strong>@{targetUser.username} (#{targetUser.id})</strong> will be permanently purged and scrubbed from the database. Historical tournament scores and team standings will be retained in anonymized form (&quot;Deleted User&quot;).
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                To confirm, type <span style={{ color: '#ef4444', fontFamily: 'monospace', fontWeight: 900 }}>DELETE PERMANENTLY</span> below:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE PERMANENTLY"
                className="input"
                style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700, borderColor: confirmPhrase === 'DELETE PERMANENTLY' ? '#10b981' : '#ef4444' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                Reason for Permanent Deletion (Logged in Audit):
              </label>
              <input
                type="text"
                value={permReason}
                onChange={(e) => setPermReason(e.target.value)}
                placeholder="e.g. User completed 30-day grace period or submitted GDPR erasure request"
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || confirmPhrase !== 'DELETE PERMANENTLY'}
                onClick={handleExecutePermanentDelete}
                className="btn btn-primary"
                style={{
                  flex: 1.2,
                  background: '#ef4444',
                  borderColor: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: confirmPhrase === 'DELETE PERMANENTLY' ? 1 : 0.5
                }}
              >
                {isDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                Execute Permanent Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
