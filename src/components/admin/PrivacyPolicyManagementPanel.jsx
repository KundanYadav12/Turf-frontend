'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText, Shield, CheckCircle2, Clock, RotateCcw,
  Upload, Eye, Edit3, Save, AlertCircle, Loader2, Sparkles
} from 'lucide-react';

export default function PrivacyPolicyManagementPanel() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('EDITOR'); // 'EDITOR' | 'VERSIONS' | 'PREVIEW'

  // Draft Editor State
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [title, setTitle] = useState('Official Privacy Policy');
  const [content, setContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/privacy-policy/versions', config);
      if (res.data.success) {
        setVersions(res.data.data);
        // Find published or latest version to seed editor
        const pub = res.data.data.find(v => v.status === 'PUBLISHED') || res.data.data[0];
        if (pub) {
          setTitle(pub.title);
          setContent(pub.content);
          setEffectiveDate(pub.effectiveDate ? new Date(pub.effectiveDate).toISOString().split('T')[0] : '');
        }
      }
    } catch (err) {
      console.error('Failed to load policy versions:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load policy versions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      setStatusMsg({ type: 'error', text: 'Policy content cannot be empty.' });
      return;
    }

    try {
      setSaving(true);
      setStatusMsg(null);
      const res = await axios.post('/api/admin/privacy-policy/draft', {
        id: selectedVersionId,
        title,
        content,
        changeSummary: changeSummary || 'Draft update',
        effectiveDate
      }, config);

      if (res.data.success) {
        setStatusMsg({ type: 'success', text: res.data.message });
        fetchVersions();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (idToPublish) => {
    const targetId = idToPublish || selectedVersionId;
    if (!targetId && !content.trim()) {
      setStatusMsg({ type: 'error', text: 'Please save draft before publishing.' });
      return;
    }

    if (!window.confirm('Are you sure you want to officially publish this Privacy Policy? It will become live immediately on the public website and mobile app.')) {
      return;
    }

    try {
      setPublishing(true);
      setStatusMsg(null);

      // If we don't have an ID, save draft first
      let id = targetId;
      if (!id) {
        const draftRes = await axios.post('/api/admin/privacy-policy/draft', {
          title,
          content,
          changeSummary: changeSummary || 'Official release',
          effectiveDate
        }, config);
        id = draftRes.data.data?.id;
      }

      const res = await axios.post(`/api/admin/privacy-policy/${id}/publish`, {
        effectiveDate,
        changeSummary
      }, config);

      if (res.data.success) {
        setStatusMsg({ type: 'success', text: res.data.message });
        fetchVersions();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to publish policy.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRestoreVersion = async (id) => {
    if (!window.confirm('Restore this historical version as the newly published official Privacy Policy?')) {
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`/api/admin/privacy-policy/${id}/restore`, {}, config);
      if (res.data.success) {
        setStatusMsg({ type: 'success', text: res.data.message });
        fetchVersions();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to restore version.' });
    } finally {
      setLoading(false);
    }
  };

  const currentPublished = versions.find(v => v.status === 'PUBLISHED');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner Card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: 14,
          border: '1px solid var(--border-glow)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>
            Legal &amp; Google Play Compliance
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.2rem 0', color: 'var(--text-heading)' }}>
            Privacy Policy Management
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Super Admin-only controls to draft, sanitize, preview, version, and officially publish the Privacy Policy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {currentPublished && (
            <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
              <div style={{ color: 'var(--text-muted)' }}>Currently Live:</div>
              <div style={{ fontWeight: 800, color: '#10b981' }}>
                Version {currentPublished.version}.0 ({new Date(currentPublished.publishedAt).toLocaleDateString()})
              </div>
            </div>
          )}

          <a
            href="/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Eye size={14} /> View Public Policy Page
          </a>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 8,
            fontSize: '0.85rem',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: statusMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: statusMsg.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'EDITOR', label: 'Policy Editor', icon: <Edit3 size={15} /> },
          { key: 'PREVIEW', label: 'Live Preview', icon: <Eye size={15} /> },
          { key: 'VERSIONS', label: `Version History (${versions.length})`, icon: <Clock size={15} /> }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className="btn btn-sm"
            style={{
              background: activeSubTab === t.key ? 'var(--accent-primary)' : 'transparent',
              color: activeSubTab === t.key ? '#fff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Sub Tab 1: Policy Editor ── */}
      {activeSubTab === 'EDITOR' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Effective Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
                Change Summary / Version Note
              </label>
              <input
                type="text"
                placeholder="e.g. Added Google Play deletion instructions and retention rules"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
              Policy Markdown / Text Content (Sanitized automatically)
            </label>
            <textarea
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.88rem', lineHeight: '1.6' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveSubTab('PREVIEW')}
              type="button"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Eye size={15} /> Preview Output
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              type="button"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
              Save Draft
            </button>
            <button
              onClick={() => handlePublish()}
              disabled={publishing}
              type="button"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10b981', borderColor: '#10b981' }}
            >
              {publishing ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
              Publish Official Policy
            </button>
          </div>
        </div>
      )}

      {/* ── Sub Tab 2: Live Preview ── */}
      {activeSubTab === 'PREVIEW' && (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 14, lineHeight: '1.8', fontSize: '0.95rem' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-heading)', margin: '0 0 0.5rem 0' }}>{title}</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Effective: {effectiveDate || 'Immediate'}</div>
          </div>
          {content.split('\n\n').map((block, idx) => {
            const trimmed = block.trim();
            if (trimmed.startsWith('# ')) return <h1 key={idx} style={{ fontSize: '1.6rem', fontWeight: 900, margin: '1.5rem 0 0.75rem' }}>{trimmed.replace('# ', '')}</h1>;
            if (trimmed.startsWith('## ')) return <h2 key={idx} style={{ fontSize: '1.3rem', fontWeight: 800, margin: '1.25rem 0 0.5rem' }}>{trimmed.replace('## ', '')}</h2>;
            if (trimmed.startsWith('### ')) return <h3 key={idx} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1rem 0 0.4rem', color: 'var(--accent-primary)' }}>{trimmed.replace('### ', '')}</h3>;
            if (trimmed.startsWith('---')) return <hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />;
            return <p key={idx} style={{ marginBottom: '1rem' }}>{trimmed}</p>;
          })}
        </div>
      )}

      {/* ── Sub Tab 3: Version History ── */}
      {activeSubTab === 'VERSIONS' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 14 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Historical Versions &amp; Drafts</h3>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Effective Date</th>
                  <th>Published Date</th>
                  <th>Author</th>
                  <th>Change Summary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 800 }}>v{v.version}.0</td>
                    <td>
                      <span className={`badge ${v.status === 'PUBLISHED' ? 'badge-success' : v.status === 'DRAFT' ? 'badge-warning' : 'badge-info'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td>{v.effectiveDate ? new Date(v.effectiveDate).toLocaleDateString() : '-'}</td>
                    <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : 'Unpublished'}</td>
                    <td>{v.authorName || 'Super Admin'}</td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.changeSummary || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => {
                            setSelectedVersionId(v.id);
                            setTitle(v.title);
                            setContent(v.content);
                            setChangeSummary(v.changeSummary || '');
                            setEffectiveDate(v.effectiveDate ? new Date(v.effectiveDate).toISOString().split('T')[0] : '');
                            setActiveSubTab('EDITOR');
                          }}
                          className="btn btn-sm btn-outline"
                          title="Load into Editor"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        {v.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handleRestoreVersion(v.id)}
                            className="btn btn-sm btn-primary"
                            title="Restore and Publish as Active Policy"
                          >
                            <RotateCcw size={13} /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
