import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { HeartHandshake, PlusCircle, Search, DollarSign, Calendar, Target, ShieldCheck, X, Trash2, Edit3, ChevronDown, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import Select from './ui/Select';


export default function DonationsModule({ userRole }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Modals & Forms
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    donor_name: '',
    amount: '',
    source: 'General Sadqah Fund',
    payment_mode: 'bank' // 'cash' | 'bank' | 'online' (lowercase)
  });

  const loadDonations = async () => {
    try {
      setLoading(true);
      const data = await database.donations.list();
      setDonations(data);
    } catch (e) {
      console.error("Error loading donations:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadDonations();
    })();
  }, []);

  const handleOpenRecord = (prefilledSource = 'General Sadqah Fund') => {
    setFormData({
      donor_name: '',
      amount: '',
      source: prefilledSource,
      payment_mode: 'bank'
    });
    setEditingDonation(null);
    setIsRecordOpen(true);
  };

  const handleOpenEditForm = (donation) => {
    setFormData({
      donor_name: donation.donor_name || '',
      amount: donation.amount || '',
      source: donation.source || 'General Sadqah Fund',
      payment_mode: donation.payment_mode || 'bank'
    });
    setEditingDonation(donation);
    setIsRecordOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cleanDonation = {
      donor_name: formData.donor_name,
      amount: Number(formData.amount),
      source: formData.source,
      payment_mode: formData.payment_mode.toLowerCase()
    };

    try {
      setIsSubmitting(true);
      if (editingDonation) {
        const res = await database.donations.update(editingDonation.id, cleanDonation);
        if (res.success) {
          setIsRecordOpen(false);
          setEditingDonation(null);
          loadDonations();
        } else {
          alert("Failed to update donation: " + res.error);
        }
      } else {
        const res = await database.donations.create(cleanDonation);
        if (res.success) {
          setIsRecordOpen(false);
          loadDonations();
        } else {
          alert("Failed to log charity donation: " + res.error);
        }
      }
    } catch (err) {
      alert("Error submitting donation: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donation record?')) {
      return;
    }

    const res = await database.donations.delete(id);
    if (res.success) {
      setDonations(prev => prev.filter(d => d.id !== id));
    } else {
      alert('Failed to delete donation: ' + res.error);
    }
  };

  // Sum campaign progress from database list
  const getCampaignSum = (campaignName) => {
    return donations
      .filter(d => d.source === campaignName)
      .reduce((sum, d) => sum + Number(d.amount), 0);
  };

  const campaigns = [
    { key: 'General Sadqah Fund', label: 'General Sadqah Fund', target: 100000, desc: 'School administration, utility bills, and repairs.' },
    { key: 'Orphan Sponsorship', label: 'Orphan Student Sponsorships', target: 50000, desc: 'Covers uniforms, textbooks, and lunch for orphaned kids.' },
    { key: 'Mosque Hall Extension', label: 'Mosque & Hifz Hall Extension', target: 150000, desc: 'Expansion of prayer hall to accommodate 200 more children.' }
  ];

  const totalCharity = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  const filteredDonations = donations.filter(d => {
    const donorName = d.donor_name.toLowerCase();
    const matchesSearch = donorName.includes(search.toLowerCase());
    const matchesSource = sourceFilter === '' || d.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const normRole = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
  const isEditable = normRole === 'admin';
  const canAddDonation = normRole === 'admin' || normRole === 'data_entry';

  return (
    <>
      {!isRecordOpen && (
        <div className="fade-in">
          <h1 className="section-title">Donation Funds</h1>

          {/* CHARITY OVERVIEW CARD */}
          <div style={styles.charityHeader} className="glass-panel">
            <div>
              <span style={styles.charityLabel}>TOTAL DONATION CAPITAL RECEIVED</span>
              <h2 style={styles.charityValue}>PKR {totalCharity.toLocaleString()}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={14} /> 100% Audited Sadaqah & Zakat Ledgers
              </span>
            </div>
            {canAddDonation && (
              <button onClick={() => handleOpenRecord('General Sadqah Fund')} className="btn-accent">
                <PlusCircle size={18} /> Record New Donation
              </button>
            )}
          </div>

          {/* CAMPAIGN VISUAL GAUGES */}
          <h3 style={styles.subHeading}><Target size={16} style={{ marginRight: 6 }} /> Active Development Campaigns</h3>
          <div style={styles.campaignGrid}>
            {campaigns.map((camp) => {
              const raised = getCampaignSum(camp.key);
              const pct = Math.min(Math.round((raised / camp.target) * 100), 100);

              return (
                <div key={camp.key} className="glass-panel" style={styles.campaignCard}>
                  <h4 style={styles.campTitle}>{camp.label}</h4>
                  <p style={styles.campDesc}>{camp.desc}</p>

                  <div style={styles.progressInfo}>
                    <span style={styles.progressLabel}>Raised: <strong>PKR {raised.toLocaleString()}</strong></span>
                    <span style={styles.progressLabel}>Target: <strong>PKR {camp.target.toLocaleString()}</strong></span>
                  </div>

                  {/* visual gauge bar */}
                  <div style={styles.gaugeBarBackground}>
                    <div style={{
                      ...styles.gaugeBarActive,
                      width: `${pct}%`,
                      backgroundColor: pct >= 100 ? 'var(--color-success)' : 'var(--color-accent)'
                    }} />
                  </div>

                  <div style={styles.campFooter}>
                    <span style={styles.pctBadge}>{pct}% Complete</span>
                    {canAddDonation && (
                      <button onClick={() => handleOpenRecord(camp.key)} style={styles.campDonateBtn}>
                        Log for this
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DONOR REGISTRY LEDGER */}
          <h3 style={styles.subHeading}><DollarSign size={16} style={{ marginRight: 6 }} /> Donor Transaction Registry</h3>

          {/* SEARCH AND FILTERS */}
          <div style={styles.filterBar} className={`glass-panel filter-bar ${!loading && filteredDonations.length === 0 ? 'configBarExpanded' : ''}`}>
            <div style={styles.searchBox} className="filter-bar__search">
              <Search size={16} color="#64748b" />
              <input autoComplete="off"
                type="text"
                placeholder="Search by donor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filtersGroup} className="filter-bar__controls">
              <div className="select-wrapper" style={{ width: 'auto' }}>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">All Sources</option>
                  <option value="General Sadqah Fund">General Sadqah Fund</option>
                  <option value="Orphan Sponsorship">Orphan Sponsorship</option>
                  <option value="Mosque Hall Extension">Mosque Hall Extension</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>
          </div>

          {/* DONOR DATA TABLE */}
          {loading ? (
            <LoadingSpinner message="Loading donation records..." />
          ) : filteredDonations.length === 0 ? (
            <EmptyState
              icon={donations.length === 0 ? HeartHandshake : Search}
              title={donations.length === 0 ? "No donations recorded" : "No matching donations found"}
              message={donations.length === 0 ? "Record a new donation transaction to get started." : "Try clearing filters or adjusting your search query."}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'donor_name',
                  header: 'Donor Name',
                  type: 'avatar',
                  subtextKey: 'source',
                  sortable: true
                },
                {
                  key: 'amount',
                  header: 'Donation Amount',
                  type: 'currency',
                  sortable: true
                },
                {
                  key: 'payment_mode',
                  header: 'Payment Mode',
                  type: 'badge',
                  sortable: true
                },
                {
                  key: 'created_at',
                  header: 'Receipt Date',
                  sortable: true,
                  render: (d) => (d.created_at ? d.created_at.substring(0, 10) : '-')
                }
              ]}
              data={filteredDonations}
              emptyIcon={HeartHandshake}
              emptyTitle="No donations found"
              emptyMessage="No matching donation transactions found."
              renderActions={(donation) => (
                <>
                  {isEditable && (
                    <>
                      <button
                        onClick={() => handleOpenEditForm(donation)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        title="Edit Details"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(donation.id)}
                        className="btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        title="Delete"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}
                </>
              )}
            />
          )}
        </div>
      )}

      {/* NEW DONATION MODAL */}
      {isRecordOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingDonation ? 'Update Donation Entry' : 'Record Sadqah / Zakat Donation'}</h3>
              <button onClick={() => setIsRecordOpen(false)} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form autoComplete="off" onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Donor Name *</label>
                <input autoComplete="off"
                  type="text"
                  required
                  placeholder="Donor Full Name / Anonymous"
                  value={formData.donor_name}
                  onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Donation Source Campaign *</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="form-input"
                    >
                      <option value="General Sadqah Fund">General Sadqah Fund</option>
                      <option value="Orphan Sponsorship">Orphan Sponsorship</option>
                      <option value="Mosque Hall Extension">Mosque Hall Extension</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Amount (PKR) *</label>
                  <input autoComplete="off"
                    type="number"
                    required
                    placeholder="Capital in PKR"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode *</label>
                <div className="select-wrapper">
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="form-input"
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="online">Easypaisa / JazzCash / Online</option>
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsRecordOpen(false)} className="btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Saving...
                    </>
                  ) : (
                    editingDonation ? 'Save Changes' : 'Post Donation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  charityHeader: {
    padding: '2rem',
    backgroundColor: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem',
    border: '1px solid var(--color-border)',
    borderLeft: '4px solid var(--color-accent)'
  },
  charityLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: '0.1em'
  },
  charityValue: {
    fontSize: '2.5rem',
    color: 'var(--color-primary)',
    fontWeight: '800',
    lineHeight: 1.1,
    margin: '0.2rem 0'
  },
  subHeading: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '1rem',
    marginTop: '1.5rem',
    display: 'flex',
    alignItems: 'center'
  },
  campaignGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  campaignCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '220px'
  },
  campTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  campDesc: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    margin: '0.5rem 0'
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.78rem',
    marginBottom: '0.4rem',
    marginTop: 'auto'
  },
  progressLabel: {
    color: 'var(--color-text-main)'
  },
  gaugeBarBackground: {
    width: '100%',
    height: '8px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.8rem'
  },
  gaugeBarActive: {
    height: '100%',
    borderRadius: '4px',
    transition: 'all 0.6s ease'
  },
  campFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pctBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-primary-light)'
  },
  campDonateBtn: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    backgroundColor: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    color: 'var(--color-primary)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  filterBar: {
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
    backgroundColor: '#fff'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.8rem',
    minWidth: '280px',
    backgroundColor: '#fff'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.9rem',
    width: '100%',
    color: 'var(--color-text-main)'
  },
  filtersGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  filterSelect: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.8rem',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 43, 33, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalCard: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    padding: '2rem',
    border: '1px solid rgba(212, 175, 55, 0.2)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.5rem'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-display)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column'
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1rem'
  },
  innerLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  noData: {
    padding: '3rem',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#fff'
  },
  deleteBtn: {
    padding: '0.35rem 0.6rem',
    fontSize: '0.78rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '500',
    transition: 'all 0.15s'
  },
  editBtn: {
    padding: '0.35rem 0.6rem',
    fontSize: '0.78rem',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    color: '#059669',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '500',
    transition: 'all 0.15s'
  }
};
