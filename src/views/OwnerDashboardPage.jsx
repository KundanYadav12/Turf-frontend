'use client';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOwnerDashboardApi } from '../services/ownerService';
import WalkinModal from '../components/owner/WalkinModal';
import CreateTournamentModal from '../components/tournament/CreateTournamentModal';
import { LayoutDashboard, Calendar, DollarSign, Users, PlusCircle, Trophy, Tv } from 'lucide-react';
import TVDisplayManagementPanel from '../components/admin/TVDisplayManagementPanel';

// Reusable KPI Card
const KpiCard = ({ label, value, icon, iconBg, valueColor }) => (
  <div className="glass-panel card-interactive" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ background: iconBg, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    </div>
    <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', color: valueColor || 'var(--text-heading)' }}>{value}</h2>
  </div>
);

// Shared table row style — adapts via CSS variable
const tdStyle = { padding: '0.85rem 0.75rem', color: 'var(--text-main)' };
const tdBoldStyle = { ...tdStyle, fontWeight: 700, color: 'var(--text-heading)' };
const trStyle = { borderBottom: '1px solid var(--border-color)' };

const OwnerDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await getOwnerDashboardApi();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="skeleton-box" style={{ height: 36, width: 320, marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ height: 16, width: 220 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton-card" style={{ height: 110 }}>
              <div className="skeleton-box" style={{ height: 14, width: '60%' }} />
              <div className="skeleton-box" style={{ height: 32, width: '40%' }} />
            </div>
          ))}
        </div>
        <div className="skeleton-card" style={{ height: 260 }}>
          <div className="skeleton-box" style={{ height: 24, width: '30%', marginBottom: '1rem' }} />
          <div className="skeleton-box" style={{ height: 40, width: '100%', marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ height: 40, width: '100%', marginBottom: '0.5rem' }} />
          <div className="skeleton-box" style={{ height: 40, width: '100%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <LayoutDashboard color="var(--accent-primary)" /> Venue Owner Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage turfs, court schedules, revenue, and offline walk-ins</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab(activeTab === 'SMART_TV' ? 'OVERVIEW' : 'SMART_TV')}
            className={`btn btn-sm ${activeTab === 'SMART_TV' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
          >
            <Tv size={16} /> {activeTab === 'SMART_TV' ? 'Overview' : '📺 Smart TV Displays'}
          </button>
          <button
            id="owner-create-tournament-btn"
            onClick={() => setIsCreateTournamentOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Trophy size={16} /> + Create Tournament
          </button>
          <Link to="/owner/calendar" className="btn btn-secondary btn-sm">
            <Calendar size={16} /> Slot Calendar
          </Link>
          <button onClick={() => setIsWalkinOpen(true)} className="btn btn-secondary btn-sm">
            <PlusCircle size={16} /> Walk-in Booking
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'OVERVIEW' ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
            color: activeTab === 'OVERVIEW' ? 'var(--text-on-accent)' : 'var(--text-muted)',
            border: activeTab === 'OVERVIEW' ? 'none' : '1px solid var(--border-color)',
            fontWeight: 700
          }}
        >
          Overview &amp; Bookings
        </button>
        <button
          onClick={() => setActiveTab('SMART_TV')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'SMART_TV' ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
            color: activeTab === 'SMART_TV' ? 'var(--text-on-accent)' : 'var(--text-muted)',
            border: activeTab === 'SMART_TV' ? 'none' : '1px solid var(--border-color)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Tv size={14} /> 📺 Smart TV Displays
        </button>
      </div>

      {activeTab === 'SMART_TV' ? (
        <TVDisplayManagementPanel />
      ) : (
        <>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
        <KpiCard
          label="Today's Bookings"
          value={stats.todayBookingsCount}
          icon={<Calendar size={18} color="var(--accent-primary)" />}
          iconBg="var(--accent-primary-glow)"
        />
        <KpiCard
          label="Today's Revenue"
          value={`₹${stats.todayRevenue}`}
          valueColor="var(--accent-primary)"
          icon={<DollarSign size={18} color="var(--accent-secondary)" />}
          iconBg="rgba(6, 182, 212, 0.15)"
        />
        <KpiCard
          label="Managed Venues"
          value={stats.totalVenues}
          icon={<Users size={18} color="var(--accent-purple)" />}
          iconBg="rgba(139, 92, 246, 0.15)"
        />
      </div>

      {/* Recent Bookings Table */}
      <div className="glass-panel" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Venue Bookings</h3>

        {stats.recentBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No recent bookings recorded.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Venue &amp; Court</th>
                  <th>Date &amp; Time</th>
                  <th>Amount</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b) => (
                  <tr key={b.id} style={trStyle}>
                    <td style={tdBoldStyle}>{b.bookingNumber}</td>
                    <td style={tdStyle}>{b.customerName}</td>
                    <td style={tdStyle}>{b.venueName} · {b.courtName}</td>
                    <td style={tdStyle}>{b.bookingDate} ({b.startTime?.substring(0, 5)})</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>₹{b.finalAmount}</td>
                    <td style={tdStyle}>
                      <span className={`badge ${b.isWalkin ? 'badge-warning' : 'badge-info'}`}>
                        {b.isWalkin ? 'Walk-in' : 'Online'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className={`badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}`}>
                        {b.bookingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Walk-in Booking Modal */}
      <WalkinModal
        isOpen={isWalkinOpen}
        onClose={() => setIsWalkinOpen(false)}
        onSuccess={() => fetchStats()}
      />

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateTournamentOpen}
        onClose={() => setIsCreateTournamentOpen(false)}
        onTournamentCreated={() => fetchStats()}
      />
        </>
      )}
    </div>
  );
};

export default OwnerDashboardPage;
