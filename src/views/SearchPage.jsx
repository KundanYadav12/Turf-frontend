import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getVenuesApi } from '../services/venueService';
import { Search, MapPin, Filter, Star, ChevronDown, ChevronUp } from 'lucide-react';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const city    = searchParams.get('city')     || 'Mumbai';
  const sport   = searchParams.get('sport')    || '';
  const query   = searchParams.get('q')        || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  useEffect(() => { fetchVenuesAndSports(); }, [searchParams]);

  const fetchVenuesAndSports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (city)     params.city     = city;
      if (sport)    params.sport    = sport;
      if (query)    params.search   = query;
      if (maxPrice) params.maxPrice = maxPrice;
      const venuesRes = await getVenuesApi(params);
      if (venuesRes.success) setVenues(venuesRes.data);
    } catch (err) {
      console.error('Failed to search venues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const np = new URLSearchParams(searchParams);
    if (value) np.set(key, value); else np.delete(key);
    setSearchParams(np);
  };

  const optStyle = { background: 'var(--bg-modal)', color: 'var(--text-main)' };

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.35rem' }}>Explore Sports Venues</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Found <strong>{venues.length}</strong> sports arenas in {city}
          </p>
        </div>

        {/* Mobile filter toggle button (hidden on desktop via CSS) */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="btn btn-secondary btn-sm mobile-filter-toggle-btn"
          style={{ gap: '0.4rem' }}
        >
          <Filter size={16} color="var(--accent-primary)" />
          <span>Filters ({[sport, maxPrice].filter(Boolean).length})</span>
          {showMobileFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <div className="search-page-layout">

        {/* ── Filters Sidebar ── */}
        <aside className={`glass-panel search-filters-sidebar ${showMobileFilters ? 'show-mobile' : ''}`} style={{ padding: '1.25rem', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Filter Venues</h3>
            </div>
            {/* Clear on mobile */}
            <button
              onClick={() => setSearchParams({ city: 'Mumbai' })}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Reset
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <select value={city} onChange={(e) => handleFilterChange('city', e.target.value)} className="form-input">
              <option value="Mumbai"    style={optStyle}>Mumbai</option>
              <option value="Bengaluru" style={optStyle}>Bengaluru</option>
              <option value="Delhi NCR" style={optStyle}>Delhi NCR</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sport Category</label>
            <select value={sport} onChange={(e) => handleFilterChange('sport', e.target.value)} className="form-input">
              <option value=""           style={optStyle}>All Sports</option>
              <option value="cricket"    style={optStyle}>Cricket</option>
              <option value="football"   style={optStyle}>Football</option>
              <option value="badminton"  style={optStyle}>Badminton</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Max Price / Hour (₹)</label>
            <input
              type="number"
              placeholder="e.g. 2000"
              value={maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="form-input"
            />
          </div>

          <button
            onClick={() => setSearchParams({ city: 'Mumbai' })}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Reset Filters
          </button>
        </aside>

        {/* ── Results ── */}
        <main style={{ minWidth: 0, width: '100%' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Searching available venues…</div>
          ) : venues.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Search size={40} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
              <h3>No Venues Found</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="venue-grid" style={{ marginTop: 0 }}>
              {venues.map((v) => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/venue/${v.slug || v.id}`)}
                  className="glass-panel venue-card"
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
                      <MapPin size={14} color="var(--text-muted)" />
                      <span>{v.address}, {v.city}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      {v.sports?.map((s) => (
                        <span key={s.id} style={{
                          background: 'var(--bg-tag)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)'
                        }}>
                          {s.name}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Starts from</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{v.startingPrice}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/hr</span>
                      </div>
                      <button className="btn btn-primary btn-sm">Book Slot</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
