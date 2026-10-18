'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, AlertCircle, Plus, Trash2, Shield, Settings } from 'lucide-react';

const AuctionConfigModal = ({ isOpen, onClose, tournamentId, initialConfig, onSaved }) => {
  const [formData, setFormData] = useState({
    name: '',
    defaultWalletAmount: 10000000,
    minSquadSize: 11,
    maxSquadSize: 16,
    bidIncrementType: 'CATEGORY_TIERED',
    defaultBidIncrement: 50000,
    bidTimerSeconds: 30,
    timerExtensionSeconds: 10,
    biddingMode: 'OPERATOR_CONTROLLED',
    startDateTime: '',
    categories: [
      { name: 'A+', basePrice: 1000000, bidIncrement: 100000, displayOrder: 1 },
      { name: 'A', basePrice: 500000, bidIncrement: 50000, displayOrder: 2 },
      { name: 'B', basePrice: 200000, bidIncrement: 25000, displayOrder: 3 },
      { name: 'C', basePrice: 100000, bidIncrement: 20000, displayOrder: 4 }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setFormData({
        name: initialConfig.name || '',
        defaultWalletAmount: initialConfig.defaultWalletAmount || 10000000,
        minSquadSize: initialConfig.minSquadSize || 11,
        maxSquadSize: initialConfig.maxSquadSize || 16,
        bidIncrementType: initialConfig.bidIncrementType || 'CATEGORY_TIERED',
        defaultBidIncrement: initialConfig.defaultBidIncrement || 50000,
        bidTimerSeconds: initialConfig.bidTimerSeconds || 30,
        timerExtensionSeconds: initialConfig.timerExtensionSeconds || 10,
        biddingMode: initialConfig.biddingMode || 'OPERATOR_CONTROLLED',
        startDateTime: initialConfig.startDateTime ? new Date(initialConfig.startDateTime).toISOString().slice(0, 16) : '',
        categories: initialConfig.categories && initialConfig.categories.length > 0
          ? initialConfig.categories.map((c) => ({
              id: c.id,
              name: c.name,
              basePrice: c.basePrice,
              bidIncrement: c.bidIncrement,
              displayOrder: c.displayOrder
            }))
          : [
              { name: 'A+', basePrice: 1000000, bidIncrement: 100000, displayOrder: 1 },
              { name: 'A', basePrice: 500000, bidIncrement: 50000, displayOrder: 2 },
              { name: 'B', basePrice: 200000, bidIncrement: 25000, displayOrder: 3 },
              { name: 'C', basePrice: 100000, bidIncrement: 20000, displayOrder: 4 }
            ]
      });
    }
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (index, field, value) => {
    const updated = [...formData.categories];
    updated[index][field] = field === 'name' ? value : Number(value);
    setFormData({ ...formData, categories: updated });
  };

  const handleAddCategory = () => {
    setFormData({
      ...formData,
      categories: [
        ...formData.categories,
        {
          name: `Tier ${formData.categories.length + 1}`,
          basePrice: 100000,
          bidIncrement: 20000,
          displayOrder: formData.categories.length + 1
        }
      ]
    });
  };

  const handleRemoveCategory = (index) => {
    if (formData.categories.length <= 1) {
      setError('At least one player category is required.');
      return;
    }
    const updated = formData.categories.filter((_, i) => i !== index);
    setFormData({ ...formData, categories: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(`/api/tournaments/${tournamentId}/auction`, formData);
      if (res.data.success) {
        setSuccess('Auction configuration saved successfully.');
        setTimeout(() => {
          if (onSaved) onSaved(res.data.data);
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save auction configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-modal, #0f172a)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: 'var(--text-main, #fff)',
        padding: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-primary, #10b981)' }}>
              <Settings size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
                Tournament Auction Configuration
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Configure rules, wallets, squad constraints, and category base prices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            <Shield size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* General Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Auction Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Premier League Auction 2026"
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Default Team Wallet (₹)
              </label>
              <input
                type="number"
                min="100000"
                step="10000"
                value={formData.defaultWalletAmount}
                onChange={(e) => setFormData({ ...formData, defaultWalletAmount: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                Default: ₹{(formData.defaultWalletAmount / 10000000).toFixed(2)} Cr
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Compulsory Squad Size (Min)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={formData.minSquadSize}
                onChange={(e) => setFormData({ ...formData, minSquadSize: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                Required to enforce mandatory reserve
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Maximum Squad Size (Optional)
              </label>
              <input
                type="number"
                min={formData.minSquadSize}
                max="40"
                value={formData.maxSquadSize}
                onChange={(e) => setFormData({ ...formData, maxSquadSize: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Mode & Timing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color, rgba(255,255,255,0.05))' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Bidding Mode
              </label>
              <select
                value={formData.biddingMode}
                onChange={(e) => setFormData({ ...formData, biddingMode: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              >
                <option value="OPERATOR_CONTROLLED">Operator Controlled (Auctioneer places bids)</option>
                <option value="TEAM_REPRESENTATIVE">Team Representative (Direct 1-tap bidding)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Bid Timer (Seconds)
              </label>
              <input
                type="number"
                min="10"
                max="180"
                value={formData.bidTimerSeconds}
                onChange={(e) => setFormData({ ...formData, bidTimerSeconds: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Timer Extension on Bid (Seconds)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.timerExtensionSeconds}
                onChange={(e) => setFormData({ ...formData, timerExtensionSeconds: Number(e.target.value) })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '0.4rem' }}>
                Bid Increment Rule
              </label>
              <select
                value={formData.bidIncrementType}
                onChange={(e) => setFormData({ ...formData, bidIncrementType: e.target.value })}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(15,23,42,0.9))',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.9rem'
                }}
              >
                <option value="CATEGORY_TIERED">Category-Specific Increments</option>
                <option value="FIXED">Fixed Amount (₹{formData.defaultBidIncrement.toLocaleString('en-IN')})</option>
                <option value="SLAB">Price Slab Increments</option>
              </select>
            </div>
          </div>

          {/* Player Categories & Base Prices */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-heading, #fff)' }}>
                  Player Categories & Base Prices
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Lowest base price determines the mandatory budget reserve
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddCategory}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: 'var(--accent-primary, #10b981)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> Add Category
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {formData.categories.map((cat, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 1.5fr auto',
                    gap: '0.75rem',
                    alignItems: 'center',
                    background: 'var(--bg-card, rgba(18,25,38,0.75))',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', marginBottom: '2px' }}>Category</label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleCategoryChange(idx, 'name', e.target.value)}
                      placeholder="e.g. A+"
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, rgba(15,23,42,0.9))',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.85rem',
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', marginBottom: '2px' }}>Base Price (₹)</label>
                    <input
                      type="number"
                      step="10000"
                      min="10000"
                      value={cat.basePrice}
                      onChange={(e) => handleCategoryChange(idx, 'basePrice', e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, rgba(15,23,42,0.9))',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        borderRadius: '6px',
                        color: 'var(--accent-primary, #10b981)',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.85rem',
                        fontWeight: 700
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', marginBottom: '2px' }}>Bid Increment (₹)</label>
                    <input
                      type="number"
                      step="5000"
                      min="5000"
                      value={cat.bidIncrement}
                      onChange={(e) => handleCategoryChange(idx, 'bidIncrement', e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-input, rgba(15,23,42,0.9))',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  <div style={{ paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(idx)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: '#f87171',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                color: 'var(--text-muted, #94a3b8)',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent-primary, #10b981)',
                border: 'none',
                color: 'var(--text-on-accent, #022c22)',
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuctionConfigModal;
