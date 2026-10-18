'use client';
import React, { useEffect, useState } from 'react';
import {
  getAdminDashboardApi,
  getUsersApi,
  updateUserStatusApi,
  getVenuesAdminApi,
  updateVenueStatusApi
} from '../services/adminService';
import { Shield, Users, Building2, DollarSign, Tv } from 'lucide-react';
import AdManagementPanel from '../components/admin/AdManagementPanel';
import PrivacyPolicyManagementPanel from '../components/admin/PrivacyPolicyManagementPanel';
import AccountDeletionManagementPanel from '../components/admin/AccountDeletionManagementPanel';
import TVDisplayManagementPanel from '../components/admin/TVDisplayManagementPanel';

const tdStyle     = { padding: '0.85rem 0.75rem', color: 'var(--text-main)' };
const tdBoldStyle = { ...tdStyle, fontWeight: 700, color: 'var(--text-heading)' };
const trStyle     = { borderBottom: '1px solid var(--border-color)' };

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdminData(); }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [dashRes, usersRes, venuesRes] = await Promise.all([
        getAdminDashboardApi(),
        getUsersApi(),
        getVenuesAdminApi()
      ]);
      if (dashRes.success)  setStats(dashRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (venuesRes.success) setVenues(venuesRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await updateUserStatusApi(userId, newStatus);
      if (res.success) fetchAdminData();
    } catch { alert('Failed to update user status.'); }
  };

  const handleToggleVenueStatus = async (venueId, currentStatus) => {
    const newStatus = currentStatus === 'APPROVED' ? 'REJECTED' : 'APPROVED';
    try {
      const res = await updateVenueStatusApi(venueId, newStatus);
      if (res.success) fetchAdminData();
    } catch { alert('Failed to update venue status.'); }
  };

  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading Super Admin Portal…</div>;
  }

  // KPI cards config
  const kpis = [
    { label: 'Total Platform Volume', value: `₹${stats.totalVolume}`, color: 'var(--text-heading)', iconBg: 'var(--btn-secondary-bg)', icon: <DollarSign size={18} color="var(--text-muted)" /> },
    { label: 'Platform Commission (10%)', value: `₹${stats.totalCommission}`, color: 'var(--accent-primary)', iconBg: 'var(--accent-primary-glow)', icon: <DollarSign size={18} color="var(--accent-primary)" />, highlight: true },
    { label: 'Registered Users', value: stats.totalUsers, color: 'var(--text-heading)', iconBg: 'rgba(6,182,212,0.12)', icon: <Users size={18} color="var(--accent-secondary)" /> },
    { label: 'Listed Venues', value: stats.totalVenues, color: 'var(--text-heading)', iconBg: 'rgba(139,92,246,0.12)', icon: <Building2 size={18} color="var(--accent-purple)" /> },
  ];

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield color="var(--accent-primary)" /> Super Admin Portal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Platform-wide monitoring, commission tracking, user &amp; venue approvals
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              border: kpi.highlight ? '1px solid var(--border-glow)' : undefined
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{kpi.label}</span>
              <div style={{ background: kpi.iconBg, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {kpi.icon}
              </div>
            </div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.2vw, 1.9rem)', color: kpi.color, marginTop: '0.2rem' }}>{kpi.value}</h2>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', overflowX: 'auto' }}>
        {['OVERVIEW', 'USERS', 'VENUES', 'ADVERTISEMENTS', 'SMART_TV', 'PRIVACY_POLICY', 'ACCOUNT_DELETIONS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
              color: activeTab === tab ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: activeTab === tab ? 'none' : '1px solid var(--border-color)',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            {tab === 'ADVERTISEMENTS' ? 'STADIUM ADS' : tab === 'SMART_TV' ? '📺 SMART TV' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW Tab ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="glass-panel" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Platform Recent Bookings</h3>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>User</th>
                  <th>Venue</th>
                  <th>Court</th>
                  <th>Amount</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} style={trStyle}>
                    <td style={tdBoldStyle}>{b.bookingNumber}</td>
                    <td style={tdStyle}>{b.userName}</td>
                    <td style={tdStyle}>{b.venueName}</td>
                    <td style={tdStyle}>{b.courtName}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>₹{b.finalAmount}</td>
                    <td style={{ ...tdStyle, color: 'var(--accent-primary)', fontWeight: 700 }}>₹{b.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── USERS Tab ── */}
      {activeTab === 'USERS' && (
        <div className="glass-panel" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>User Management</h3>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 550 }}>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={tdBoldStyle}>{u.fullName}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}><span className="badge badge-info">{u.role}</span></td>
                    <td style={tdStyle}>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{u.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className={`btn btn-sm ${u.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VENUES Tab ── */}
      {activeTab === 'VENUES' && (
        <div className="glass-panel" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Venue Approvals &amp; Listings</h3>
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 550 }}>
              <thead>
                <tr>
                  <th>Venue Name</th>
                  <th>City</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id} style={trStyle}>
                    <td style={tdBoldStyle}>{v.name}</td>
                    <td style={tdStyle}>{v.city}</td>
                    <td style={tdStyle}>{v.ownerName} <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>({v.ownerEmail})</span></td>
                    <td style={tdStyle}>
                      <span className={`badge ${v.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>{v.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggleVenueStatus(v.id, v.status)}
                        className={`btn btn-sm ${v.status === 'APPROVED' ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {v.status === 'APPROVED' ? 'Revoke' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STADIUM ADS Tab ── */}
      {activeTab === 'ADVERTISEMENTS' && (
        <AdManagementPanel />
      )}

      {/* ── SMART TV MODE Tab ── */}
      {activeTab === 'SMART_TV' && (
        <TVDisplayManagementPanel />
      )}

      {/* ── PRIVACY POLICY Tab ── */}
      {activeTab === 'PRIVACY_POLICY' && (
        <PrivacyPolicyManagementPanel />
      )}

      {/* ── ACCOUNT DELETIONS Tab ── */}
      {activeTab === 'ACCOUNT_DELETIONS' && (
        <AccountDeletionManagementPanel />
      )}
    </div>
  );
};

export default AdminDashboardPage;
