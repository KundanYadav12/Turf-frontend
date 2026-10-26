import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getSportsApi, getVenuesApi } from '../services/venueService';
import { setVenues, setSelectedSport, setSelectedCity } from '../features/venue/venueSlice';
import { Search, MapPin, Star, ChevronRight, ShieldCheck, Zap, Award, Sparkles } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedSport, selectedCity } = useSelector((state) => state.venue || {});
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const sportsRes = await getSportsApi();
      const venuesRes = await getVenuesApi({});
      if (venuesRes.success) {
        setFeaturedVenues(venuesRes.data);
        dispatch(setVenues(venuesRes.data));
      }
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/search?city=${selectedCity || 'Mumbai'}&sport=${selectedSport || ''}&q=${searchQuery}`);
  };

  const optStyle = { background: 'var(--bg-modal)', color: 'var(--text-main)' };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero-section">
        <div className="container">
          {/* Pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'var(--accent-primary-glow)',
            border: '1px solid var(--border-glow)',
            padding: '0.35rem 0.9rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            marginBottom: '1.25rem'
          }}>
            <Sparkles size={15} /> Instant Slot Booking &amp; Sports Management
          </div>

          <h1 className="hero-title">
            Book Premier <span className="hero-highlight">Turfs &amp; Courts</span>
            <br />Near You Instantly
          </h1>
          <p className="hero-subtitle">
            Find FIFA-standard football turfs, box cricket pitches, and synthetic badminton courts.
            Real-time availability with zero double-booking guarantee.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="glass-panel search-bar-card">
            <div style={{ position: 'relative', width: '100%' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                <select
                  value={selectedCity || 'Mumbai'}
                  onChange={(e) => dispatch(setSelectedCity(e.target.value))}
                  style={{ border: 'none', backgroundColor: 'transparent', padding: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', outline: 'none', cursor: 'pointer', width: '100%' }}
                >
                  <option value="Mumbai" style={optStyle}>Mumbai</option>
                  <option value="Bengaluru" style={optStyle}>Bengaluru</option>
                  <option value="Delhi NCR" style={optStyle}>Delhi NCR</option>
                </select>
              </div>
            </div>

            <div className="search-bar-field-divider" style={{ width: '100%' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sport</label>
              <select
                value={selectedSport || ''}
                onChange={(e) => dispatch(setSelectedSport(e.target.value))}
                style={{ border: 'none', backgroundColor: 'transparent', padding: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', outline: 'none', cursor: 'pointer', width: '100%' }}
              >
                <option value="" style={optStyle}>All Sports</option>
                <option value="cricket" style={optStyle}>Cricket</option>
                <option value="football" style={optStyle}>Football</option>
                <option value="badminton" style={optStyle}>Badminton</option>
              </select>
            </div>

            <div className="search-bar-field-divider" style={{ width: '100%' }}>
              <label className="form-label" style={{ marginBottom: '0.2rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Venue / Area</label>
              <input
                type="text"
                placeholder="Search venue or locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--text-main)', fontSize: '0.92rem', outline: 'none', width: '100%' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem 1.25rem', whiteSpace: 'nowrap' }}>
              <Search size={18} /> Search Slots
            </button>
          </form>
        </div>
      </section>

      {/* ── Sports Categories ── */}
      <section className="container" style={{ margin: 'clamp(2rem, 4vw, 3.5rem) auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Explore Sports</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select a sport to filter venues</span>
        </div>

        <div className="sports-grid">
          {[
            { id: 1, name: 'Cricket',    icon: '🏏', slug: 'cricket',    active: true,  count: '12+ Turfs' },
            { id: 2, name: 'Football',   icon: '⚽', slug: 'football',   active: true,  count: '8+ Grounds' },
            { id: 3, name: 'Badminton',  icon: '🏸', slug: 'badminton',  active: true,  count: '15+ Courts' },
            { id: 4, name: 'Tennis',     icon: '🎾', slug: 'tennis',     active: false, count: 'Coming Soon' },
            { id: 5, name: 'Basketball', icon: '🏀', slug: 'basketball', active: false, count: 'Coming Soon' },
          ].map((sp) => (
            <div
              key={sp.id}
              onClick={() => { if (sp.active) { dispatch(setSelectedSport(sp.slug)); navigate(`/search?sport=${sp.slug}`); } }}
              className="glass-panel"
              style={{
                padding: 'clamp(0.85rem, 2vw, 1.25rem)',
                borderRadius: 'var(--radius-md)',
                cursor: sp.active ? 'pointer' : 'not-allowed',
                border: selectedSport === sp.slug ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                opacity: sp.active ? 1 : 0.5,
                transition: 'var(--transition-fast)',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>{sp.icon}</div>
              <h3 style={{ fontSize: '0.98rem', marginBottom: '0.2rem' }}>{sp.name}</h3>
              <span style={{ fontSize: '0.78rem', color: sp.active ? 'var(--accent-primary)' : 'var(--text-dim)' }}>
                {sp.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Venues ── */}
      <section className="container" style={{ margin: 'clamp(2.5rem, 5vw, 4rem) auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>Popular Sports Venues</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Top-rated turfs with verified floodlights &amp; facilities
            </p>
          </div>
          <button onClick={() => navigate('/search')} className="btn btn-outline btn-sm">
            View All <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="venue-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-card" style={{ height: 320 }}>
                <div className="skeleton-box" style={{ height: 160, width: '100%', borderRadius: 'var(--radius-sm)' }} />
                <div className="skeleton-box" style={{ height: 22, width: '70%' }} />
                <div className="skeleton-box" style={{ height: 16, width: '45%' }} />
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton-box" style={{ height: 24, width: '30%' }} />
                  <div className="skeleton-box" style={{ height: 32, width: '35%', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="venue-grid">
            {featuredVenues.map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/venue/${v.slug || v.id}`)}
                className="glass-panel venue-card card-interactive"
                style={{ cursor: 'pointer' }}
              >
                <div className="venue-card-image">
                  <img src={v.primaryImage} alt={v.name} />
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                    <span className="badge badge-success" style={{ backdropFilter: 'blur(10px)' }}>
                      <Star size={12} fill="currentColor" /> {v.rating} ({v.reviewCount})
                    </span>
                  </div>
                </div>

                <div className="venue-card-body">
                  <h3 className="venue-title">{v.name}</h3>
                  <div className="venue-location">
                    <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span>{v.address}, {v.city}</span>
                  </div>

                  {/* Sport tags */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {v.sports?.map((s) => (
                      <span key={s.id} style={{
                        background: 'var(--bg-tag)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)'
                      }}>
                        {s.name}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Starts from</span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{v.startingPrice}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hr</span>
                    </div>
                    <button className="btn btn-primary btn-sm">Book Slot</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Features Banner ── */}
      <section className="container" style={{ margin: 'clamp(2.5rem, 5vw, 4.5rem) auto 2rem auto' }}>
        <div className="glass-panel" style={{
          padding: 'clamp(1.5rem, 3.5vw, 3rem)',
          background: 'linear-gradient(135deg, var(--accent-primary-glow) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'clamp(1.25rem, 3vw, 2rem)' }}>
            {[
              {
                icon: <Zap size={22} color="var(--accent-primary)" />,
                bg: 'var(--accent-primary-glow)',
                title: 'Instant Slot Confirmation',
                desc: 'Real-time concurrency engine locks slots instantly. Zero risk of double bookings.'
              },
              {
                icon: <ShieldCheck size={22} color="var(--accent-secondary)" />,
                bg: 'rgba(6, 182, 212, 0.15)',
                title: 'Verified Venues & Quality',
                desc: 'High-lux floodlights, FIFA-grade turf grass, and clean changing amenities.'
              },
              {
                icon: <Award size={22} color="var(--accent-purple)" />,
                bg: 'rgba(139, 92, 246, 0.15)',
                title: 'SaaS Venue Management',
                desc: 'Venue owners manage online + offline walk-in bookings with live slot grids.'
              }
            ].map((f, i) => (
              <div key={i}>
                <div style={{
                  background: f.bg,
                  width: '42px', height: '42px',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.85rem'
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
