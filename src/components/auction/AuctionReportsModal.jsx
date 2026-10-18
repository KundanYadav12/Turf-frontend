'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Award, Users, Trophy, DollarSign, Download, Printer, CheckCircle, AlertTriangle, Shield } from 'lucide-react';

const AuctionReportsModal = ({ isOpen, onClose, auctionId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'teams' | 'players'

  useEffect(() => {
    if (!isOpen || !auctionId) return;

    const fetchReports = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/auctions/${auctionId}/reports`);
        if (res.data.success) {
          setReportData(res.data.data);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load auction reports.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [isOpen, auctionId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.players) return;
    const headers = ['Player Name', 'Category', 'Role', 'Base Price', 'Sold Price', 'Status', 'Winning Team'];
    const rows = reportData.players.map((p) => [
      `"${p.name || ''}"`,
      `"${p.category || ''}"`,
      `"${p.role || ''}"`,
      p.basePrice || 0,
      p.soldPrice || 0,
      p.status || '',
      `"${p.winningTeam ? p.winningTeam.name : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auction_report_${auctionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        maxWidth: '960px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: 'var(--text-main, #fff)',
        padding: '1.75rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '10px', color: 'var(--accent-amber, #f59e0b)' }}>
              <Trophy size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading, #fff)' }}>
                Official Auction Reports & Analytics
              </h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                Post-auction financials, squad completeness, and player sale transactions
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                color: 'var(--text-secondary, #cbd5e1)',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Export CSV
            </button>
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
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingBottom: '0.5rem' }}>
          {[
            { key: 'summary', label: '📊 Summary' },
            { key: 'teams', label: '🛡️ Team Squads' },
            { key: 'players', label: '🏏 Player Sales' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                background: activeTab === t.key ? 'var(--accent-primary, #10b981)' : 'transparent',
                color: activeTab === t.key ? 'var(--text-on-accent, #022c22)' : 'var(--text-muted, #94a3b8)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #94a3b8)' }}>
            Generating auction report...
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', color: '#f87171' }}>
            {error}
          </div>
        ) : !reportData ? null : (
          <div>
            {/* SUMMARY TAB */}
            {activeTab === 'summary' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-card, rgba(18,25,38,0.75))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>Total Players</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                      {reportData.summary.totalRegistered}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card, rgba(18,25,38,0.75))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>Players Sold</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)', marginTop: '4px' }}>
                      {reportData.summary.totalSold}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card, rgba(18,25,38,0.75))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>Unsold / Remaining</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber, #f59e0b)', marginTop: '4px' }}>
                      {reportData.summary.totalUnsold + reportData.summary.totalAvailable}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card, rgba(18,25,38,0.75))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>Total Money Spent</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)', marginTop: '4px' }}>
                      ₹{reportData.summary.totalSpent.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-card, rgba(18,25,38,0.75))', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #64748b)' }}>Average Sale</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                      ₹{Math.round(reportData.summary.averageSale).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {reportData.summary.highestSalePlayer && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(16,185,129,0.08))',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'rgba(245,158,11,0.2)', padding: '10px', borderRadius: '50%', color: 'var(--accent-amber, #f59e0b)' }}>
                        <Trophy size={28} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber, #f59e0b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Highest Sale of the Auction
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading, #fff)' }}>
                          {reportData.summary.highestSalePlayer.name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                          Won by: {reportData.summary.highestSalePlayer.team}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-primary, #10b981)' }}>
                      ₹{reportData.summary.highestSalePlayer.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TEAMS SQUADS TAB */}
            {activeTab === 'teams' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reportData.teams.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg-card, rgba(18,25,38,0.75))',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                      borderRadius: '12px',
                      padding: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.06))', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield size={20} color="var(--accent-primary, #10b981)" />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading, #fff)' }}>
                            {t.teamName}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                            Squad: {t.playersPurchased} / {t.minSquadSize} Compulsory
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Spent</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                            ₹{t.amountSpent.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>Remaining</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary, #cbd5e1)' }}>
                            ₹{t.remainingBalance.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          {t.isSquadComplete ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <CheckCircle size={13} /> Squad Complete
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              <AlertTriangle size={13} /> {t.minSquadSize - t.playersPurchased} Slot(s) Needed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Squad Players */}
                    {t.squad.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-dim, #64748b)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                        No players acquired yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem' }}>
                        {t.squad.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                              borderRadius: '8px',
                              padding: '0.6rem 0.8rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading, #fff)' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                                {p.category} • {p.role ? p.role.replace('_', ' ') : ''}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary, #10b981)' }}>
                              ₹{p.purchasePrice.toLocaleString('en-IN')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* PLAYER SALES TAB */}
            {activeTab === 'players' && (
              <div style={{ border: '1px solid var(--border-color, rgba(255,255,255,0.08))', borderRadius: '10px', overflowX: 'auto', background: 'var(--bg-card, rgba(18,25,38,0.75))' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim, #64748b)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Player</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Base Price</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Sale Price</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Winning Team</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.players.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-heading, #fff)' }}>
                          {p.name}
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                            {p.role ? p.role.replace('_', ' ') : ''}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {p.category || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                          ₹{p.basePrice.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: p.soldPrice ? 'var(--accent-primary, #10b981)' : 'var(--text-dim, #64748b)' }}>
                          {p.soldPrice ? `₹${p.soldPrice.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-heading, #fff)' }}>
                          {p.winningTeam ? p.winningTeam.name : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: p.status === 'SOLD' ? 'rgba(16,185,129,0.15)' :
                                        p.status === 'UNSOLD' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
                            color: p.status === 'SOLD' ? '#34d399' :
                                   p.status === 'UNSOLD' ? '#f87171' : 'var(--text-muted, #94a3b8)'
                          }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--accent-primary, #10b981)',
              border: 'none',
              color: 'var(--text-on-accent, #022c22)',
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionReportsModal;
