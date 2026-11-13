'use client';
import React, { useState, useEffect } from 'react';
import {
  Smartphone, Upload, RotateCcw, AlertTriangle, CheckCircle,
  PlusCircle, RefreshCw, Download, FileText, ArrowUpCircle,
  Shield, Info, CheckCircle2, XCircle, Trash2, Zap, Package, Eye, Pencil
} from 'lucide-react';
import {
  getAppUpdateAnalyticsApi,
  getAppReleasesApi,
  createAppReleaseApi,
  updateAppReleaseApi,
  publishAppReleaseApi,
  rollbackAppReleaseApi,
  deleteAppReleaseApi
} from '../../services/adminService';

export default function AppUpdateManagementPanel() {
  const [analytics, setAnalytics] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('RELEASES'); // 'RELEASES' | 'ANALYTICS' | 'GUIDE'
  const [statusMsg, setStatusMsg] = useState(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    version: '',
    buildNumber: '',
    title: '',
    releaseNotes: '',
    updateType: 'OTA', // 'OTA' | 'NATIVE'
    minAppVersion: '1.0.0',
    isMandatory: false,
    platform: 'android',
    status: 'PUBLISHED', // 'PUBLISHED' | 'DRAFT'
    apkUrl: '',
    bundleUrl: ''
  });
  const [bundleFile, setBundleFile] = useState(null);
  const [apkFile, setApkFile] = useState(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editReleaseId, setEditReleaseId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    version: '',
    buildNumber: '',
    title: '',
    releaseNotes: '',
    updateType: 'OTA',
    minAppVersion: '1.0.0',
    isMandatory: false,
    platform: 'android',
    status: 'PUBLISHED',
    apkUrl: '',
    bundleUrl: ''
  });
  const [editBundleFile, setEditBundleFile] = useState(null);
  const [editApkFile, setEditApkFile] = useState(null);

  // Rollback Modal State
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Details Modal State
  const [viewRelease, setViewRelease] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, releasesRes] = await Promise.all([
        getAppUpdateAnalyticsApi(),
        getAppReleasesApi({ limit: 50 })
      ]);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (releasesRes.success) setReleases(releasesRes.items || []);
    } catch (err) {
      console.error('Failed to load mobile update data:', err);
      setStatusMsg({ type: 'error', text: 'Failed to load update management data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.version.trim()) {
      setStatusMsg({ type: 'error', text: 'Version name is required (e.g. 1.1.0).' });
      return;
    }
    if (!formData.buildNumber) {
      setStatusMsg({ type: 'error', text: 'Build number is required.' });
      return;
    }
    if (!formData.title.trim()) {
      setStatusMsg({ type: 'error', text: 'Release title is required.' });
      return;
    }
    if (!formData.releaseNotes.trim()) {
      setStatusMsg({ type: 'error', text: 'Release notes are required.' });
      return;
    }

    let apkUrl = formData.apkUrl?.trim() || '';
    let bundleUrl = formData.bundleUrl?.trim() || '';

    if (formData.updateType === 'OTA' && !bundleFile && !bundleUrl) {
      bundleUrl = '/uploads/mobile-updates/turf-ota-bundle.hbc';
    }

    if (formData.updateType === 'NATIVE' && !apkFile && !apkUrl) {
      apkUrl = '/uploads/mobile-updates/app-release.apk';
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('version', formData.version.trim());
      data.append('buildNumber', formData.buildNumber);
      data.append('title', formData.title.trim());
      data.append('releaseNotes', formData.releaseNotes.trim());
      data.append('updateType', formData.updateType);
      data.append('minAppVersion', formData.minAppVersion || '1.0.0');
      data.append('isMandatory', formData.isMandatory ? 'true' : 'false');
      data.append('platform', formData.platform);
      data.append('status', formData.status);
      if (apkUrl) data.append('apkUrl', apkUrl);
      if (bundleUrl) data.append('bundleUrl', bundleUrl);
      if (bundleFile) data.append('bundle', bundleFile);
      if (apkFile) data.append('apk', apkFile);

      const res = await createAppReleaseApi(data);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Release v${formData.version} created and broadcasted successfully!` });
        setIsCreateOpen(false);
        setFormData({
          version: '',
          buildNumber: '',
          title: '',
          releaseNotes: '',
          updateType: 'OTA',
          minAppVersion: '1.0.0',
          isMandatory: false,
          platform: 'android',
          status: 'PUBLISHED',
          apkUrl: '',
          bundleUrl: ''
        });
        setBundleFile(null);
        setApkFile(null);
        fetchData();
      }
    } catch (err) {
      console.error('Create release error:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create release.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (rel) => {
    setEditReleaseId(rel.id);
    setEditFormData({
      version: rel.version,
      buildNumber: String(rel.build_number),
      title: rel.title || '',
      releaseNotes: rel.release_notes || '',
      updateType: rel.update_type || 'OTA',
      minAppVersion: rel.min_app_version || '1.0.0',
      isMandatory: Boolean(rel.is_mandatory),
      platform: rel.platform || 'android',
      status: rel.status || 'PUBLISHED',
      apkUrl: rel.apk_url || '',
      bundleUrl: rel.bundle_url || ''
    });
    setEditBundleFile(null);
    setEditApkFile(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.version.trim()) {
      setStatusMsg({ type: 'error', text: 'Version name is required.' });
      return;
    }
    if (!editFormData.buildNumber) {
      setStatusMsg({ type: 'error', text: 'Build number is required.' });
      return;
    }

    let apkUrl = editFormData.apkUrl?.trim() || '';
    let bundleUrl = editFormData.bundleUrl?.trim() || '';

    if (editFormData.updateType === 'OTA' && !editBundleFile && !bundleUrl) {
      bundleUrl = '/uploads/mobile-updates/turf-ota-bundle.hbc';
    }
    if (editFormData.updateType === 'NATIVE' && !editApkFile && !apkUrl) {
      apkUrl = '/uploads/mobile-updates/app-release.apk';
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('version', editFormData.version.trim());
      data.append('buildNumber', editFormData.buildNumber);
      data.append('title', editFormData.title.trim());
      data.append('releaseNotes', editFormData.releaseNotes.trim());
      data.append('updateType', editFormData.updateType);
      data.append('minAppVersion', editFormData.minAppVersion || '1.0.0');
      data.append('isMandatory', editFormData.isMandatory ? 'true' : 'false');
      data.append('platform', editFormData.platform);
      data.append('status', editFormData.status);
      if (apkUrl) data.append('apkUrl', apkUrl);
      if (bundleUrl) data.append('bundleUrl', bundleUrl);
      if (editBundleFile) data.append('bundle', editBundleFile);
      if (editApkFile) data.append('apk', editApkFile);

      const res = await updateAppReleaseApi(editReleaseId, data);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Release v${editFormData.version} updated successfully and broadcasted to devices!` });
        setIsEditOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Update release error:', err);
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update release.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (releaseId, version) => {
    if (!window.confirm(`Are you sure you want to publish Release v${version}? This will immediately notify active devices.`)) {
      return;
    }
    try {
      const res = await publishAppReleaseApi(releaseId);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Release v${version} published successfully!` });
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to publish release.' });
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      setRollbackLoading(true);
      const res = await rollbackAppReleaseApi(rollbackTarget.id);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Release v${rollbackTarget.version} successfully rolled back.` });
        setRollbackTarget(null);
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to rollback release.' });
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleDelete = async (releaseId, version) => {
    if (!window.confirm(`Delete draft release v${version}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await deleteAppReleaseApi(releaseId);
      if (res.success) {
        setStatusMsg({ type: 'success', text: `Release v${version} deleted.` });
        fetchData();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.response?.data?.message || 'Failed to delete release.' });
    }
  };

  return (
    <div>
      {/* Status Alert Banner */}
      {statusMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-sm, 8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
          color: statusMsg.type === 'success' ? '#10b981' : '#ef4444',
          fontWeight: 600,
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="kpi-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="glass-panel card-interactive" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Published Version</span>
            <div style={{ background: 'var(--accent-primary-glow)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={18} color="var(--accent-primary)" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-heading)', margin: '0.2rem 0' }}>
            {analytics?.latestRelease ? `v${analytics.latestRelease.version}` : 'v1.0.0'}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 600 }}>
              (Build #{analytics?.latestRelease?.build_number || 1})
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              {analytics?.latestRelease?.update_type === 'OTA' ? '⚡ Active OTA Release' : '📦 Native APK Active'}
            </span>
            {analytics?.latestRelease?.is_mandatory ? (
              <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Mandatory</span>
            ) : (
              <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)' }}>Optional</span>
            )}
          </div>
        </div>

        <div className="glass-panel card-interactive" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered Devices</span>
            <div style={{ background: 'rgba(56, 189, 248, 0.12)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={18} color="#38bdf8" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#38bdf8', margin: '0.2rem 0' }}>
            {analytics?.totalDevices || 0}
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {analytics?.activeDevices || 0} active in last 30 days
          </span>
        </div>

        <div className="glass-panel card-interactive" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Adoption Rate</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpCircle size={18} color="#10b981" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#10b981', margin: '0.2rem 0' }}>
            {analytics?.adoptionPercentage || 100}%
          </h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {analytics?.devicesOnLatest || 0} on latest • {analytics?.devicesPendingUpdate || 0} pending
          </div>
        </div>

        <div className="glass-panel card-interactive" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>OTA Success vs Failures</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.12)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#8b5cf6" />
            </div>
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-heading)', margin: '0.2rem 0' }}>
            {analytics?.totalInstalls || 0} <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>installs</span>
          </h2>
          <span style={{ fontSize: '0.78rem', color: analytics?.totalFailures > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            {analytics?.totalFailures || 0} failed • {analytics?.totalDownloads || 0} downloads
          </span>
        </div>
      </div>

      {/* Control Action Bar & Sub-Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        marginBottom: '1.5rem',
        padding: '0.85rem 1rem',
        background: 'var(--bg-card, #1e293b)',
        borderRadius: 'var(--radius-sm, 8px)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setSubTab('RELEASES')}
            className={`btn btn-sm ${subTab === 'RELEASES' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '6px' }}
          >
            <Smartphone size={15} /> All Releases ({releases.length})
          </button>
          <button
            onClick={() => setSubTab('ANALYTICS')}
            className={`btn btn-sm ${subTab === 'ANALYTICS' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '6px' }}
          >
            <ArrowUpCircle size={15} /> Fleet Adoption Analytics
          </button>
          <button
            onClick={() => setSubTab('GUIDE')}
            className={`btn btn-sm ${subTab === 'GUIDE' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '6px' }}
          >
            <Info size={15} /> Update Safety &amp; Rollback Guide
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '6px' }}
            title="Refresh Releases"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              // Pre-fill next version
              const latestBuild = analytics?.latestRelease?.build_number || releases[0]?.build_number || 1;
              const nextBuild = latestBuild + 1;
              const curVer = analytics?.latestRelease?.version || '1.0.0';
              const parts = curVer.split('.').map(n => parseInt(n, 10) || 0);
              const nextVer = `${parts[0] || 1}.${(parts[1] || 0) + 1}.0`;

              setFormData({
                version: nextVer,
                buildNumber: String(nextBuild),
                title: '',
                releaseNotes: '',
                updateType: 'OTA',
                minAppVersion: '1.0.0',
                isMandatory: false,
                platform: 'android',
                status: 'PUBLISHED',
                apkUrl: '',
                bundleUrl: ''
              });
              setBundleFile(null);
              setApkFile(null);
              setIsCreateOpen(true);
            }}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 800,
              borderRadius: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <PlusCircle size={16} />
            <span>+ New Release</span>
          </button>
        </div>
      </div>

      {/* ── SUB-TAB: RELEASES ── */}
      {subTab === 'RELEASES' && (
        <div className="glass-panel" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-heading)' }}>
              Release Deployment History
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Managed OTA and Native releases distributed to mobile devices
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Title &amp; Notes</th>
                  <th>Type</th>
                  <th>Min Version</th>
                  <th>Policy</th>
                  <th>Status</th>
                  <th>Released At</th>
                  <th>Adoption</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {releases.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No mobile releases recorded. Click <strong>+ New Release</strong> to publish your first OTA or Native update.
                    </td>
                  </tr>
                ) : (
                  releases.map((rel) => {
                    const isPublished = rel.status === 'PUBLISHED';
                    const isRolledBack = rel.status === 'ROLLED_BACK';
                    const isDraft = rel.status === 'DRAFT';

                    return (
                      <tr key={rel.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ fontWeight: 800, color: 'var(--text-heading)' }}>
                          v{rel.version}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Build #{rel.build_number} • {rel.platform}
                          </div>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rel.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rel.release_notes?.replace(/\\n/g, ' ')}
                          </div>
                        </td>
                        <td>
                          {rel.update_type === 'OTA' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 800,
                              fontSize: '0.74rem'
                            }}>
                              <Zap size={12} /> OTA
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#a78bfa',
                              fontWeight: 800,
                              fontSize: '0.74rem'
                            }}>
                              <Package size={12} /> NATIVE
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          v{rel.min_app_version || '1.0.0'}
                        </td>
                        <td>
                          {rel.is_mandatory ? (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 800, fontSize: '0.72rem' }}>
                              Required
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                              Optional
                            </span>
                          )}
                        </td>
                        <td>
                          {isPublished && (
                            <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>
                              PUBLISHED
                            </span>
                          )}
                          {isRolledBack && (
                            <span className="badge badge-danger" style={{ fontSize: '0.74rem' }}>
                              ROLLED BACK
                            </span>
                          )}
                          {isDraft && (
                            <span className="badge badge-warning" style={{ fontSize: '0.74rem' }}>
                              DRAFT
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unpublished'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>
                            {rel.installCount || 0}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '3px' }}>
                            installs
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleOpenEdit(rel)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                              title="Edit Release & Change Version"
                            >
                              <Pencil size={13} /> Edit
                            </button>

                            <button
                              onClick={() => setViewRelease(rel)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                              title="View Release Details & Hash"
                            >
                              <Eye size={13} /> Details
                            </button>

                            {isDraft && (
                              <button
                                onClick={() => handlePublish(rel.id, rel.version)}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                title="Publish Release to Devices"
                              >
                                Publish
                              </button>
                            )}

                            {isPublished && (
                              <button
                                onClick={() => setRollbackTarget(rel)}
                                className="btn btn-danger btn-sm"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                                title="Roll back to previous working release"
                              >
                                <RotateCcw size={13} /> Rollback
                              </button>
                            )}

                            {isDraft && (
                              <button
                                onClick={() => handleDelete(rel.id, rel.version)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.35rem 0.5rem', color: '#ef4444' }}
                                title="Delete Draft"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-TAB: ANALYTICS ── */}
      {subTab === 'ANALYTICS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-heading)' }}>
              Active Version Distribution
            </h3>
            {analytics?.versionDistribution && analytics.versionDistribution.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {analytics.versionDistribution.map((v, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-heading)' }}>v{v.version}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{v.deviceCount} devices ({v.percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${v.percentage}%`, height: '100%', background: i === 0 ? 'var(--accent-primary, #10b981)' : '#38bdf8', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No device telemetry recorded yet.</p>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-heading)' }}>
              Adoption &amp; Telemetry Funnel
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Smartphone size={18} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Registered App Devices</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-heading)' }}>{analytics?.totalDevices || 0}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Download size={18} color="#38bdf8" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>OTA Update Downloads</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#38bdf8' }}>{analytics?.totalDownloads || 0}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Successful Activations</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>{analytics?.totalInstalls || 0}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <XCircle size={18} color="#ef4444" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Installation Failures</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ef4444' }}>{analytics?.totalFailures || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB: GUIDE ── */}
      {subTab === 'GUIDE' && (
        <div className="glass-panel" style={{ padding: '1.5rem', lineHeight: 1.6 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--accent-primary)" />
            Safe Update &amp; Rollback Protocols
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            <div style={{ background: 'var(--bg-elevated, rgba(255,255,255,0.03))', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38bdf8', fontWeight: 800, marginBottom: '0.5rem' }}>
                <Zap size={18} /> Compatible OTA Updates
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                OTA updates apply to JavaScript code, React components, CSS/styles, and UI fixes. They install silently or upon user tap without requiring the user to download an APK. Each bundle is hashed with SHA-256 for cryptographic integrity before being executed.
              </p>
            </div>

            <div style={{ background: 'var(--bg-elevated, rgba(255,255,255,0.03))', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#a78bfa', fontWeight: 800, marginBottom: '0.5rem' }}>
                <Package size={18} /> Native Android APK Updates
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Native releases are required whenever adding new Android native modules, changing native permissions, or upgrading the native Expo SDK. The user receives an in-app prompt directing them to the signed APK download or store listing.
              </p>
            </div>

            <div style={{ background: 'var(--bg-elevated, rgba(255,255,255,0.03))', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#ef4444', fontWeight: 800, marginBottom: '0.5rem' }}>
                <RotateCcw size={18} /> Instant Rollback Protocol
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                If an OTA update introduces an unforeseen bug, Superadmin can tap <strong>Rollback</strong>. The current release is instantly marked as ROLLED_BACK, the previous stable bundle is reinstated, and connected mobile apps reload safely without user intervention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / PUBLISH MODAL ── */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={22} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-heading)' }}>
                  Publish Mobile App Release
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {/* Update Type Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-heading)' }}>
                  Update Delivery Mechanism
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, updateType: 'OTA' }))}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: formData.updateType === 'OTA' ? '2px solid var(--accent-primary, #10b981)' : '1px solid var(--border-color)',
                      background: formData.updateType === 'OTA' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                      color: formData.updateType === 'OTA' ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <Zap size={16} /> <span>⚡ Over-the-Air (OTA)</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Instant JS/UI update. No APK download needed.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, updateType: 'NATIVE' }))}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: formData.updateType === 'NATIVE' ? '2px solid #8b5cf6' : '1px solid var(--border-color)',
                      background: formData.updateType === 'NATIVE' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                      color: formData.updateType === 'NATIVE' ? '#a78bfa' : 'var(--text-muted)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <Package size={16} /> <span>📦 Native APK Release</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Required for SDK upgrades or native permissions.
                    </div>
                  </button>
                </div>
              </div>

              {/* Version & Build Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                    Version Name *
                  </label>
                  <input
                    type="text"
                    placeholder="1.1.0"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                    Build Number *
                  </label>
                  <input
                    type="number"
                    placeholder="2"
                    value={formData.buildNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, buildNumber: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                    required
                  />
                </div>
              </div>

              {/* Release Title */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                  Release Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pickleball Golden Point & Court Switch Ends"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.88rem' }}
                  required
                />
              </div>

              {/* Release Notes */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                  Release Notes (Shown to mobile users) *
                </label>
                <textarea
                  rows={4}
                  placeholder="• Added Golden Point tie-break rule&#10;• Added court switch ends button&#10;• Improved live match streaming zoom"
                  value={formData.releaseNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical' }}
                  required
                />
              </div>

              {/* File Uploads based on type */}
              {formData.updateType === 'OTA' ? (
                <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'rgba(56, 189, 248, 0.06)', borderRadius: '8px', border: '1px dashed rgba(56, 189, 248, 0.3)' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#38bdf8' }}>
                    Upload OTA Bundle Package (.jsbundle / .bundle / .zip)
                  </label>
                  <input
                    type="file"
                    accept=".bundle,.jsbundle,.zip,.tar,.gz,.js"
                    onChange={(e) => setBundleFile(e.target.files[0] || null)}
                    style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Or provide external bundle URL:
                  </div>
                  <input
                    type="url"
                    placeholder="https://.../index.android.bundle"
                    value={formData.bundleUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, bundleUrl: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', fontSize: '0.82rem', marginTop: '0.25rem' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'rgba(139, 92, 246, 0.06)', borderRadius: '8px', border: '1px dashed rgba(139, 92, 246, 0.3)' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#a78bfa' }}>
                    Upload Native Android APK (.apk)
                  </label>
                  <input
                    type="file"
                    accept=".apk"
                    onChange={(e) => setApkFile(e.target.files[0] || null)}
                    style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Or provide download URL (Google Play / S3 / Direct APK link):
                  </div>
                  <input
                    type="url"
                    placeholder="https://.../turf-app-release.apk"
                    value={formData.apkUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, apkUrl: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', fontSize: '0.82rem', marginTop: '0.25rem' }}
                  />
                </div>
              )}

              {/* Version Requirements & Policies */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                    Minimum App Version
                  </label>
                  <input
                    type="text"
                    value={formData.minAppVersion}
                    onChange={(e) => setFormData(prev => ({ ...prev, minAppVersion: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-heading)' }}>
                    Publication Action
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="PUBLISHED">Publish Immediately</option>
                    <option value="DRAFT">Save as Draft</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Toggle */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="checkbox"
                  id="mandatory-check"
                  checked={formData.isMandatory}
                  onChange={(e) => setFormData(prev => ({ ...prev, isMandatory: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#ef4444', cursor: 'pointer' }}
                />
                <label htmlFor="mandatory-check" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)', cursor: 'pointer' }}>
                  Mandatory Update (Blocks mobile app usage until updated)
                </label>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 800 }}
                >
                  {submitting ? 'Packaging & Uploading…' : formData.status === 'PUBLISHED' ? 'Publish Release Now' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT RELEASE MODAL ── */}
      {isEditOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'var(--accent-primary-glow)', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={18} color="var(--accent-primary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-heading)' }}>
                    Edit Mobile Release &amp; Change Version
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Update version metadata. If published, connected devices will be notified immediately.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Version Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.version}
                    onChange={(e) => setEditFormData({ ...editFormData, version: e.target.value })}
                    placeholder="e.g. 1.1.0"
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Build Number *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editFormData.buildNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, buildNumber: e.target.value })}
                    placeholder="e.g. 2"
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Release Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="e.g. Major UI & Tournament Improvements"
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                  Release Notes &amp; Changelog *
                </label>
                <textarea
                  required
                  rows={3}
                  value={editFormData.releaseNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, releaseNotes: e.target.value })}
                  placeholder="• Fixed streaming scoreboard&#10;• Added player registration tabs"
                  className="form-input"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Update Type
                  </label>
                  <select
                    value={editFormData.updateType}
                    onChange={(e) => setEditFormData({ ...editFormData, updateType: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="OTA">⚡ Quick OTA Update (JS Bundle)</option>
                    <option value="NATIVE">📦 Native Android APK</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                    Release Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="PUBLISHED">🟢 Published (Broadcast Active)</option>
                    <option value="DRAFT">🟡 Draft (Hidden from Devices)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="checkbox"
                  id="editIsMandatory"
                  checked={editFormData.isMandatory}
                  onChange={(e) => setEditFormData({ ...editFormData, isMandatory: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
                <label htmlFor="editIsMandatory" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)' }}>
                  Mandatory Update (forces app update modal without dismiss button)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.5rem', fontWeight: 800 }}
                >
                  {submitting ? 'Saving…' : 'Save & Update Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ROLLBACK CONFIRMATION MODAL ── */}
      {rollbackTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ef4444', marginBottom: '1rem' }}>
              <AlertTriangle size={26} />
              <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-heading)' }}>
                Confirm Release Rollback
              </h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to roll back <strong>v{rollbackTarget.version} (Build #{rollbackTarget.build_number})</strong>?
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#ef4444' }}>
              This will deactivate this release immediately and restore the previous working bundle across all connected mobile devices via real-time socket signals.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRollbackTarget(null)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRollback}
                disabled={rollbackLoading}
                className="btn btn-danger"
                style={{ fontWeight: 800 }}
              >
                {rollbackLoading ? 'Rolling back…' : 'Execute Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RELEASE DETAILS MODAL ── */}
      {viewRelease && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '1.75rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-heading)' }}>
                Release v{viewRelease.version} Details
              </h2>
              <button
                onClick={() => setViewRelease(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Build:</strong> Build #{viewRelease.build_number} ({viewRelease.platform})
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Type:</strong> {viewRelease.update_type}
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Policy:</strong> {viewRelease.is_mandatory ? 'Mandatory' : 'Optional'}
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>SHA-256 Bundle Integrity Hash:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(0,0,0,0.3)', padding: '0.45rem', borderRadius: '6px', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                  {viewRelease.bundle_hash || 'N/A (Native/Unbundled)'}
                </div>
              </div>
              {viewRelease.bundle_url && (
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Bundle URL:</strong>
                  <div style={{ wordBreak: 'break-all', fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                    <a href={viewRelease.bundle_url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                      {viewRelease.bundle_url}
                    </a>
                  </div>
                </div>
              )}
              {viewRelease.apk_url && (
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>APK Link:</strong>
                  <div style={{ wordBreak: 'break-all', fontSize: '0.8rem', color: '#a78bfa', marginTop: '0.2rem' }}>
                    <a href={viewRelease.apk_url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                      {viewRelease.apk_url}
                    </a>
                  </div>
                </div>
              )}
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Release Notes:</strong>
                <div style={{ whiteSpace: 'pre-line', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.25rem' }}>
                  {viewRelease.release_notes}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => setViewRelease(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

