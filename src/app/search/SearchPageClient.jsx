'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getVenuesApi } from '../../services/venueService';
import { Search, MapPin, Filter, Star, ChevronDown, ChevronUp } from 'lucide-react';

export default function SearchPageClient({ initialVenues = [], searchParamsServer = {} }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const city = searchParams?.get('city') || searchParamsServer.city || 'Mumbai';
  const sport = searchParams?.get('sport') || searchParamsServer.sport || '';
  const query = searchParams?.get('q') || searchParamsServer.q || '';
  const maxPrice = searchParams?.get('maxPrice') || searchParamsServer.maxPrice || '';

  const [venues, setVenues] = useState(initialVenues);
  const [loading, setLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    // Only refetch if client query deviates from initial SSR
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const params = {};
        if (city) params.city = city;
        if (sport) params.sport = sport;
        if (query) params.search = query;
        if (maxPrice) params.maxPrice = maxPrice;
        const res = await getVenuesApi(params);
        if (res.success) setVenues(res.data);
      } catch (err) {
        console.error('Failed to search venues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, [city, sport, query, maxPrice]);

  const handleFilterChange = (key, value) => {
    const sp = new URLSearchParams(searchParams?.toString() || '');
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.push(`/search?${sp.toString()}`, { scroll: false });
  };

  const optStyle = { background: 'var(--bg-modal)' };

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 3.5vw, 3rem) clamp(0.75rem, 2.5vw, 1.5rem)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', marginBottom: '0.35rem' }}>
            {sport ? `${sport.charAt(0).toUpperCase() + sport.slice(1)} Turfs & Grounds` : 'Explore Sports Venues'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Found <strong>{venues.length}</strong> verified sports arenas in {city}
          </p>
        </div>

        {/* Mobile filter toggle */}
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
            <button
              onClick={() => router.push('/search?city=Mumbai')}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Reset
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <select value={city} onChange={(e) => handleFilterChange('city', e.target.value)} className="form-input">
              <option value="Mumbai" style={optStyle}>Mumbai</option>
              <option value="Bengaluru" style={optStyle}>Bengaluru</option>
              <option value="Delhi NCR" style={optStyle}>Delhi NCR</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sport Category</label>
            <select value={sport} onChange={(e) => handleFilterChange('sport', e.target.value)} className="form-input">
              <option value="" style={optStyle}>All Sports</option>
              <option value="cricket" style={optStyle}>Cricket</option>
              <option value="football" style={optStyle}>Football</option>
              <option value="badminton" style={optStyle}>Badminton</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Max Price (₹/hr)</label>
            <input
              type="number"
              placeholder="e.g. 2500"
              value={maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Name / Locality</label>
            <input
              type="text"
              placeholder="e.g. Andheri, Turf Club..."
              value={query}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              className="form-input"
            />
          </div>
        </aside>

        {/* ── Results Grid ── */}
        <main className="search-results-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Searching arenas…</div>
          ) : venues.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '1.05rem' }}>
                No sports venues matched your filter criteria in {city}.
              </p>
              <button
                onClick={() => router.push('/search?city=Mumbai')}
                className="btn btn-outline"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="venue-grid">
              {venues.map((v) => (
                <Link
                  key={v.id}
                  href={`/venue/${v.slug || v.id}`}
                  className="glass-panel venue-card"
                  style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}
                >
                  <div className="venue-card-image">
                    <img src={v.primaryImage || '/placeholder-turf.jpg'} alt={`${v.name} in ${v.city}`} loading="lazy" />
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                      <span className="badge badge-success" style={{ backdropFilter: 'blur(10px)' }}>
                        <Star size={12} fill="currentColor" /> {v.rating || '4.8'} ({v.reviewCount || 12})
                      </span>
                    </div>
                  </div>

                  <div className="venue-card-body">
                    <h3 className="venue-title">{v.name}</h3>
                    <div className="venue-location">
                      <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <span>{v.address}, {v.city}</span>
                    </div>

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
                      <span className="btn btn-primary btn-sm">Book Slot</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
