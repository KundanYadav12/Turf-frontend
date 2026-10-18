'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCourtSlotsApi } from '../../../services/bookingService';
import CheckoutModal from '../../../components/player/CheckoutModal';
import { MapPin, Star, Clock, ShieldCheck, CheckCircle, ChevronRight } from 'lucide-react';

export default function VenueDetailClient({ venue }) {
  const [selectedCourt, setSelectedCourt] = useState(venue.courts?.[0] || null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (selectedCourt) {
      fetchCourtSlots(selectedCourt.id, selectedDate);
    }
  }, [selectedCourt, selectedDate]);

  const fetchCourtSlots = async (courtId, date) => {
    try {
      setSlotsLoading(true);
      const res = await getCourtSlotsApi(courtId, date);
      if (res.success) {
        setSlots(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const generateDates = () => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return { isoDate, label };
    });
  };

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      {/* ── Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <ol style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0, alignItems: 'center' }}>
          <li><Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link></li>
          <li>/</li>
          <li><Link href={`/search?city=${encodeURIComponent(venue.city || '')}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{venue.city || 'Venues'}</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{venue.name}</li>
        </ol>
      </nav>

      {/* ── Venue Header ── */}
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 2.5vw, 2rem)', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <div className="venue-detail-header-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success">
                <Star size={12} fill="currentColor" /> {venue.rating || '4.8'} ({venue.reviewCount || 12} Reviews)
              </span>
              <span className="badge badge-info">Verified Turf Partner</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.5rem', lineHeight: 1.25 }}>{venue.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <MapPin size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>{venue.address}, {venue.city}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.65', marginBottom: '1.25rem' }}>
              {venue.description}
            </p>
            {/* Amenities */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {venue.amenities?.map((am) => (
                <div key={am.id || am.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: 'var(--bg-tag)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)'
                }}>
                  <CheckCircle size={14} color="var(--accent-primary)" />
                  <span>{am.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', width: '100%', height: 'clamp(220px, 35vw, 320px)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <img
              src={venue.primaryImage || '/placeholder-turf.jpg'}
              alt={`${venue.name} Turf Arena in ${venue.city}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* ── Booking Console ── */}
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 2.5vw, 2rem)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Select Pitch &amp; Slot Schedule</h2>

        {/* Court Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {venue.courts?.map((court) => (
            <button
              key={court.id}
              onClick={() => { setSelectedCourt(court); setSelectedSlot(null); }}
              className={`btn ${selectedCourt?.id === court.id ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {court.name} ({court.sport?.name || 'Multi-Sport'})
            </button>
          ))}
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {generateDates().map((d) => (
            <button
              key={d.isoDate}
              onClick={() => { setSelectedDate(d.isoDate); setSelectedSlot(null); }}
              style={{
                background: selectedDate === d.isoDate ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: selectedDate === d.isoDate ? 'var(--text-on-accent)' : 'var(--text-main)',
                border: selectedDate === d.isoDate ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'var(--transition-fast)'
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Slots Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Pricing: <strong>₹{selectedCourt?.basePricePerHour || venue.startingPrice}/hour</strong>
            </span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-primary)' }}></span> Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-rose)' }}></span> Booked
              </span>
            </div>
          </div>

          {slotsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Checking real-time slot inventory…</div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No available time slots found for this date.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
              {slots.map((s, idx) => {
                const isSelected = selectedSlot?.startTime === s.startTime;
                const isAvailable = s.isAvailable;
                return (
                  <button
                    key={idx}
                    disabled={!isAvailable}
                    onClick={() => setSelectedSlot(s)}
                    style={{
                      padding: '0.85rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected
                        ? 'var(--slot-selected-bg)'
                        : isAvailable ? 'var(--slot-available-bg)' : 'var(--slot-booked-bg)',
                      border: isSelected
                        ? '2px solid var(--accent-primary)'
                        : isAvailable ? '1px solid var(--slot-available-border)' : '1px solid var(--slot-booked-border)',
                      color: isSelected
                        ? 'var(--slot-selected-text)'
                        : isAvailable ? 'var(--slot-available-text)' : 'var(--slot-booked-text)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <Clock size={12} />
                      <span>{s.startTime?.substring(0, 5)} - {s.endTime?.substring(0, 5)}</span>
                    </div>
                    <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.9 }}>
                      {isAvailable ? 'Available' : 'Booked'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Checkout Bar */}
          {selectedSlot && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-glow)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Selected Slot ({selectedDate})</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  {selectedSlot.startTime?.substring(0, 5)} to {selectedSlot.endTime?.substring(0, 5)} &bull; {selectedCourt?.name}
                </span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
              >
                Proceed to Checkout <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          venue={venue}
          court={selectedCourt}
          date={selectedDate}
          slot={selectedSlot}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setIsCheckoutOpen(false);
            setSelectedSlot(null);
            if (selectedCourt) fetchCourtSlots(selectedCourt.id, selectedDate);
          }}
        />
      )}
    </div>
  );
}
