import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVenueDetailsApi } from '../services/venueService';
import { getCourtSlotsApi } from '../services/bookingService';
import CheckoutModal from '../components/player/CheckoutModal';
import { MapPin, Star, Clock, ShieldCheck, CheckCircle, ChevronRight } from 'lucide-react';

const VenueDetailPage = () => {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => { fetchVenueDetails(); }, [idOrSlug]);
  useEffect(() => { if (selectedCourt) fetchCourtSlots(selectedCourt.id, selectedDate); }, [selectedCourt, selectedDate]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      const res = await getVenueDetailsApi(idOrSlug);
      if (res.success) {
        setVenue(res.data);
        if (res.data.courts?.length > 0) setSelectedCourt(res.data.courts[0]);
      }
    } catch (err) {
      console.error('Failed to load venue:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourtSlots = async (courtId, date) => {
    try {
      setSlotsLoading(true);
      const res = await getCourtSlotsApi(courtId, date);
      if (res.success) setSlots(res.data);
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

  if (loading || !venue) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading sports venue…</div>;
  }

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>

      {/* ── Venue Header ── */}
      <div className="glass-panel" style={{ padding: 'clamp(1.25rem, 2.5vw, 2rem)', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <div className="venue-detail-header-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
              <span className="badge badge-success">
                <Star size={12} fill="currentColor" /> {venue.rating} ({venue.reviewCount} Reviews)
              </span>
              <span className="badge badge-info">Verified Turf Partner</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.5rem', lineHeight: 1.25 }}>{venue.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <MapPin size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>{venue.address}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.65', marginBottom: '1.25rem' }}>
              {venue.description}
            </p>
            {/* Amenities */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {venue.amenities?.map((am) => (
                <div key={am.id} style={{
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

          {/* Venue Image */}
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 'clamp(200px, 30vw, 260px)', width: '100%' }}>
            <img src={venue.images?.[0]} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="venue-detail-booking-layout">
        <main style={{ minWidth: 0 }}>
          {/* Step 1: Court Selector */}
          <div className="glass-panel" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Step 1: Select Court / Turf</h3>
            <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {venue.courts?.map((court) => (
                <button
                  key={court.id}
                  onClick={() => { setSelectedCourt(court); setSelectedSlot(null); }}
                  className="btn"
                  style={{
                    background: selectedCourt?.id === court.id ? 'var(--accent-primary)' : 'var(--btn-secondary-bg)',
                    color: selectedCourt?.id === court.id ? 'var(--text-on-accent)' : 'var(--text-main)',
                    border: selectedCourt?.id === court.id ? 'none' : '1px solid var(--border-color)',
                    padding: '0.65rem 1.1rem',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{court.name}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, marginTop: '0.15rem' }}>₹{court.basePrice}/hr · {court.surfaceType}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Date Picker */}
          <div className="glass-panel" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem' }}>Step 2: Choose Playing Date</h3>
            <div className="touch-tabs-bar" style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {generateDates().map((d) => (
                <button
                  key={d.isoDate}
                  onClick={() => { setSelectedDate(d.isoDate); setSelectedSlot(null); }}
                  className="btn"
                  style={{
                    background: selectedDate === d.isoDate ? 'var(--accent-primary-glow)' : 'var(--btn-secondary-bg)',
                    border: selectedDate === d.isoDate ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: selectedDate === d.isoDate ? 'var(--accent-primary)' : 'var(--text-muted)',
                    padding: '0.55rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Time Slot Grid */}
          <div className="glass-panel" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Step 3: Select Time Slot</h3>
              <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.78rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--slot-available-text)' }}>
                  <span style={{ width: 10, height: 10, background: 'var(--slot-available-bg)', border: '1px solid var(--slot-available-border)', borderRadius: 2, display: 'inline-block' }} />
                  Available
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--slot-booked-text)' }}>
                  <span style={{ width: 10, height: 10, background: 'var(--slot-booked-bg)', border: '1px solid var(--slot-booked-border)', borderRadius: 2, display: 'inline-block' }} />
                  Booked
                </span>
              </div>
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Calculating availability…</div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No slots available for this court on the selected date.</div>
            ) : (
              <div className="slot-grid">
                {slots.map((slot, i) => {
                  const isAvailable = slot.status === 'AVAILABLE';
                  const isSelected  = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={i}
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`slot-btn ${isSelected ? 'selected' : isAvailable ? 'available' : 'booked'}`}
                    >
                      <div>{slot.startTime.substring(0, 5)}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.8 }}>₹{slot.price}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── Booking Summary Sidebar ── */}
        <aside style={{ width: '100%' }}>
          <div className="glass-panel booking-summary-sidebar" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Booking Summary
            </h3>

            {selectedCourt && (
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Court</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)', marginTop: '0.1rem' }}>{selectedCourt.name}</p>
              </div>
            )}

            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Date</span>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '0.1rem' }}>{selectedDate}</p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Selected Time Slot</span>
              <p style={{ fontSize: '1.05rem', fontWeight: 800, color: selectedSlot ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                {selectedSlot ? `${selectedSlot.startTime.substring(0, 5)} – ${selectedSlot.endTime.substring(0, 5)}` : 'Select a slot above'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                <span style={{ color: 'var(--text-heading)' }}>Total</span>
                <span style={{ color: 'var(--accent-primary)' }}>₹{selectedSlot ? selectedSlot.price : selectedCourt?.basePrice || 0}</span>
              </div>
            </div>

            <button
              disabled={!selectedSlot}
              onClick={() => setIsCheckoutOpen(true)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem' }}
            >
              Proceed to Checkout <ChevronRight size={18} />
            </button>
          </div>
        </aside>
      </div>

      {/* ── Checkout Modal ── */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        court={selectedCourt}
        date={selectedDate}
        slot={selectedSlot}
        venue={venue}
        onSuccess={() => fetchCourtSlots(selectedCourt.id, selectedDate)}
      />
    </div>
  );
};

export default VenueDetailPage;
