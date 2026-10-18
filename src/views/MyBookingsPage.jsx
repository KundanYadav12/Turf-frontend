'use client';
import React, { useEffect, useState } from 'react';
import { getMyBookingsApi, cancelBookingApi } from '../services/bookingService';
import { Ticket, Calendar, Clock, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode.react';

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await getMyBookingsApi();
      if (res.success) setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this slot booking?')) return;
    try {
      const res = await cancelBookingApi(bookingId);
      if (res.success) { alert('Booking cancelled successfully.'); fetchBookings(); }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'UPCOMING')   return b.bookingStatus === 'CONFIRMED' && b.bookingDate >= todayStr;
    if (activeTab === 'COMPLETED')  return b.bookingStatus === 'CONFIRMED' && b.bookingDate < todayStr;
    if (activeTab === 'CANCELLED')  return b.bookingStatus === 'CANCELLED';
    return true;
  });

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>

      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Ticket color="var(--accent-primary)" /> My Slot Bookings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View your active QR entry tickets and booking history</p>
      </div>

      {/* Tabs */}
      <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', overflowX: 'auto' }}>
        {['UPCOMING', 'COMPLETED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
              color: activeTab === tab ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: activeTab === tab ? 'none' : '1px solid var(--border-color)',
              flexShrink: 0
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading your tickets…</div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <AlertCircle size={36} color="var(--text-dim)" style={{ marginBottom: '0.75rem' }} />
          <h3>No {activeTab.toLowerCase()} bookings found</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Explore turfs and book your next match slot.</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map((b) => (
            <div key={b.id} className="glass-panel" style={{ padding: 'clamp(1rem, 2.5vw, 1.5rem)' }}>

              {/* Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.15rem' }}>Ticket ID</span>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-heading)' }}>{b.bookingNumber}</strong>
                </div>
                <span className={`badge ${b.bookingStatus === 'CONFIRMED' ? 'badge-success' : 'badge-danger'}`}>
                  {b.bookingStatus}
                </span>
              </div>

              {/* Booking Details */}
              <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 0', margin: '0.75rem 0' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.2rem', color: 'var(--text-heading)' }}>{b.venueName}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>{b.courtName}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--accent-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} /> <span>Date: {b.bookingDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> <span>Time: {b.startTime?.substring(0, 5)} – {b.endTime?.substring(0, 5)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Amount Paid</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>₹{b.finalAmount}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {b.bookingStatus === 'CONFIRMED' && activeTab === 'UPCOMING' && (
                    <button onClick={() => handleCancel(b.id)} className="btn btn-danger btn-sm">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => setSelectedTicket(b)} className="btn btn-primary btn-sm">
                    View QR Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Ticket Modal */}
      {selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 'min(92vw, 440px)', padding: 'clamp(1.5rem, 3.5vw, 2rem)' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>Gate Entrance Ticket</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Booking: <strong style={{ color: 'var(--text-heading)' }}>{selectedTicket.bookingNumber}</strong>
            </p>

            {/* QR always on white background for scannability */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', width: 'fit-content', margin: '0 auto 1.25rem auto' }}>
              <QRCode value={selectedTicket.qrCodeToken} size={160} />
            </div>

            <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.06em', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '1.25rem' }}>
              {selectedTicket.venueName} · {selectedTicket.courtName}
            </div>

            <button onClick={() => setSelectedTicket(null)} className="btn btn-secondary" style={{ width: '100%' }}>
              Close Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
