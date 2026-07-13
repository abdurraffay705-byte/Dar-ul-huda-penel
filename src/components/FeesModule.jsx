import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { CreditCard, Search, PlusCircle, Printer, X, Check, Landmark, History, Trash2, Edit3, ChevronDown, Calendar, GraduationCap, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import InfoCard from './InfoCard';
import logoImg from '../assets/logo.jpg';


export default function FeesModule({ userRole }) {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [editingFee, setEditingFee] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({ totalDue: 0, totalPaid: 0, totalPending: 0 });

  // Form Fields
  const [invoiceForm, setInvoiceForm] = useState({
    student_id: '',
    amount: 3500,
    due_date: new Date().toISOString().split('T')[0],
    status: 'unpaid'
  });

  const [paymentForm, setPaymentForm] = useState({
    fee_id: '',
    amount_paid: 3500,
    payment_mode: 'cash', // 'cash' | 'bank' | 'online' (lowercase)
    payment_date: new Date().toISOString().split('T')[0]
  });

  const loadFeeData = async () => {
    try {
      setLoading(true);
      const [feeData, studentData] = await Promise.all([
        database.fees.list(),
        database.students.list()
      ]);
      
      setStudents(studentData);

      // We must calculate exact paid and outstanding metrics across all invoices
      let due = 0;
      let paid = 0;
      
      const mappedFees = [];
      for (const fee of feeData) {
        const payments = await database.fees.paymentsList(fee.id);
        const sumPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
        
        due += Number(fee.amount);
        paid += sumPaid;

        mappedFees.push({
          ...fee,
          total_paid: sumPaid,
          payments
        });
      }

      setFees(mappedFees);
      setStats({
        totalDue: due,
        totalPaid: paid,
        totalPending: due - paid
      });
    } catch (e) {
      console.error("Error loading fee ledger:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadFeeData();
    })();
  }, []);

  const handleOpenInvoiceModal = () => {
    if (students.length === 0) {
      alert("Please admit students first before generating billing invoices.");
      return;
    }
    setInvoiceForm({
      student_id: students[0].id,
      amount: 3500,
      due_date: new Date().toISOString().split('T')[0],
      status: 'unpaid'
    });
    setEditingFee(null);
    setIsInvoiceOpen(true);
  };

  const handleOpenEditInvoiceModal = (fee) => {
    setInvoiceForm({
      student_id: fee.student_id,
      amount: Number(fee.amount),
      due_date: fee.due_date,
      status: fee.status
    });
    setEditingFee(fee);
    setIsInvoiceOpen(true);
  };

  const handleOpenPaymentModal = (fee = null) => {
    if (fees.length === 0) {
      alert("Please generate outstanding invoices first.");
      return;
    }
    setPaymentForm({
      fee_id: fee ? fee.id : fees[0].id,
      amount_paid: fee ? (Number(fee.amount) - Number(fee.total_paid)) : 3500,
      payment_mode: 'cash',
      payment_date: new Date().toISOString().split('T')[0]
    });
    setIsPaymentOpen(true);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingFee) {
        const res = await database.fees.update(editingFee.id, {
          student_id: invoiceForm.student_id,
          amount: Number(invoiceForm.amount),
          due_date: invoiceForm.due_date,
          status: invoiceForm.status
        });
        if (res.success) {
          setIsInvoiceOpen(false);
          setEditingFee(null);
          loadFeeData();
        } else {
          alert("Failed to update billing invoice: " + res.error);
        }
      } else {
        const res = await database.fees.create({
          student_id: invoiceForm.student_id,
          amount: Number(invoiceForm.amount),
          due_date: invoiceForm.due_date,
          status: invoiceForm.status || 'unpaid'
        });
        if (res.success) {
          setIsInvoiceOpen(false);
          loadFeeData();
        } else {
          alert("Failed to create billing invoice: " + res.error);
        }
      }
    } catch (err) {
      alert("Error submitting billing invoice: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await database.fees.recordPayment({
        ...paymentForm,
        amount_paid: Number(paymentForm.amount_paid)
      });
      if (res.success) {
        setIsPaymentOpen(false);
        loadFeeData();
      } else {
        alert("Failed to post payment: " + res.error);
      }
    } catch (err) {
      alert("Error recording payment: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceipt = (fee) => {
  setActiveInvoice(fee);
  setPaymentsHistory(fee.payments || []);
};

const handleMarkPaid = async (feeId) => {
  const res = await database.fees.updateStatus(feeId, 'paid');
  if (res.success) {
    loadFeeData();
  } else {
    alert('Failed to mark as paid: ' + res.error);
  }
};

const handleDeleteInvoice = async (feeId) => {
  if (!window.confirm('Are you sure you want to delete this invoice?')) {
    return;
  }

  const res = await database.fees.delete(feeId);
  if (res.success) {
    if (activeInvoice?.id === feeId) {
      setActiveInvoice(null);
    }
    setFees(prev => prev.filter(f => f.id !== feeId));
    const deletedFee = fees.find(f => f.id === feeId);
    if (deletedFee) {
      setStats(prev => ({
        totalDue: prev.totalDue - Number(deletedFee.amount),
        totalPaid: prev.totalPaid - Number(deletedFee.total_paid),
        totalPending: prev.totalPending - (Number(deletedFee.amount) - Number(deletedFee.total_paid))
      }));
    }
  } else {
    alert('Failed to delete invoice: ' + res.error);
  }
};

const handlePrint = () => {
  window.print();
};

  const filteredFees = fees.filter(f => {
    const studentName = f.student_name || '';
    const matchesSearch = studentName.toLowerCase().includes(search.toLowerCase()) || f.roll_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const normRole = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
  const isEditable = normRole === 'admin';
  const canAdd = normRole === 'admin' || normRole === 'data_entry';

  return (
    <>
      {!isInvoiceOpen && !isPaymentOpen && !activeInvoice && (
        <div className="fade-in">
      <h1 className="section-title">Tuition Fees</h1>

      {/* STATS OVERVIEW CARDS */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel stat-card" style={{ padding: '1.1rem' }}>
          <div>
            <span style={styles.statLabel}>Total Invoiced Amount</span>
            <h3 style={{ ...styles.statValue, color: 'var(--color-primary)' }}>PKR {stats.totalDue.toLocaleString()}</h3>
          </div>
          <div className="stat-icon blue" style={{ width: 40, height: 40 }}><Landmark size={20} /></div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1.1rem' }}>
          <div>
            <span style={styles.statLabel}>Total Received Cash</span>
            <h3 style={{ ...styles.statValue, color: 'var(--color-success)' }}>PKR {stats.totalPaid.toLocaleString()}</h3>
          </div>
          <div className="stat-icon green" style={{ width: 40, height: 40 }}><Check size={20} /></div>
        </div>

        <div className="glass-panel stat-card" style={{ padding: '1.1rem' }}>
          <div>
            <span style={styles.statLabel}>Outstanding Debts</span>
            <h3 style={{ ...styles.statValue, color: 'var(--color-danger)' }}>PKR {stats.totalPending.toLocaleString()}</h3>
          </div>
          <div className="stat-icon red" style={{ width: 40, height: 40 }}><X size={20} /></div>
        </div>
      </div>

      {/* ACTIONS BAR */}
      <div style={styles.filterBar} className={`glass-panel filter-bar ${!loading && filteredFees.length === 0 ? 'configBarExpanded' : ''}`}>
        <div style={styles.searchBox} className="filter-bar__search">
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search by student name or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup} className="filter-bar__controls">
          <div className="select-wrapper" style={{ width: 'auto' }}>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              style={styles.filterSelect}
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          {canAdd && (
            <>
              <button onClick={handleOpenInvoiceModal} className="btn-secondary">
                Generate Invoice
              </button>
              <button onClick={() => handleOpenPaymentModal(null)} className="btn-primary">
                <PlusCircle size={16} /> Record Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEES TABLE LIST */}
      {loading ? (
        <div style={styles.innerLoader}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: 10 }}>Loading financial invoices...</p>
        </div>
      ) : filteredFees.length === 0 ? (
        <EmptyState
          icon={fees.length === 0 ? CreditCard : Search}
          title={fees.length === 0 ? "No fee invoices registered" : "No matching invoices found"}
          message={fees.length === 0 ? "Record a new payment or generate invoices to get started." : "Try clearing filters or adjusting your search query."}
        />
      ) : (
        <div className="info-card-grid">
          {filteredFees.map((fee) => {
            const isOverdue = new Date(fee.due_date) < new Date() && fee.status === 'unpaid';
            const cardActions = [];
            if (canAdd) {
              cardActions.push({
                label: 'Edit',
                icon: Edit3,
                onClick: () => handleOpenEditInvoiceModal(fee),
                variant: 'secondary'
              });
            }
            if (canAdd && fee.status === 'unpaid') {
              cardActions.push({
                label: 'Post Cash',
                onClick: () => handleOpenPaymentModal(fee),
                variant: 'primary'
              });
            }
            if (fee.total_paid > 0) {
              cardActions.push({
                label: 'Receipt',
                icon: Printer,
                onClick: () => handleOpenReceipt(fee),
                variant: 'secondary'
              });
            }
            if (fee.status === 'unpaid') {
              cardActions.push({
                label: 'Mark as Paid',
                icon: Check,
                onClick: () => handleMarkPaid(fee.id),
                variant: 'success'
              });
            }
            if (isEditable) {
              cardActions.push({
                label: 'Delete',
                icon: Trash2,
                onClick: () => handleDeleteInvoice(fee.id),
                variant: 'danger'
              });
            }

            return (
              <InfoCard
                key={fee.id}
                avatarInitial={fee.student_name ? fee.student_name.charAt(0) : '?'}
                name={fee.student_name}
                badgeLabel={fee.status}
                badgeType={fee.status}
                infoRows={[
                  { icon: GraduationCap, label: 'Roll Number', value: fee.roll_number },
                  { icon: CreditCard, label: 'Invoiced', value: `PKR ${Number(fee.amount).toLocaleString()}` },
                  { 
                    icon: Landmark, 
                    label: 'Total Paid', 
                    value: `PKR ${Number(fee.total_paid).toLocaleString()}`,
                    iconColor: 'var(--color-success)',
                    valueStyle: { fontWeight: '700', color: 'var(--color-success)' }
                  },
                  { icon: Calendar, label: 'Due Date', value: fee.due_date }
                ]}
                actions={cardActions}
                style={isOverdue ? {
                  backgroundColor: '#fef2f2',
                  borderLeft: '4px solid var(--color-danger)'
                } : {}}
              />
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* GENERATE BILLING INVOICE MODAL */}
      {isInvoiceOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingFee ? 'Edit Fee Invoice' : 'Generate New Fee Invoice'}</h3>
              <button onClick={() => { setIsInvoiceOpen(false); setEditingFee(null); }} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} style={styles.modalForm}>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <div className="select-wrapper">
                    <select
                      value={invoiceForm.status}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                      className="form-input"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              <div className="form-group">
                <label className="form-label">Select Student *</label>
                <div className="select-wrapper">
                  <select
                    value={invoiceForm.student_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, student_id: e.target.value })}
                    className="form-input"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.roll_number} - {s.full_name} ({s.class})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Invoice Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => { setIsInvoiceOpen(false); setEditingFee(null); }} className="btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Processing...
                    </>
                  ) : (
                    editingFee ? 'Save Invoice' : 'Publish Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Record Fee Cash Collection</h3>
              <button onClick={() => setIsPaymentOpen(false)} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Select Fee Invoice *</label>
                <div className="select-wrapper">
                  <select
                    value={paymentForm.fee_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, fee_id: e.target.value })}
                    className="form-input"
                  >
                    {fees.filter(f => f.status === 'unpaid').map(f => (
                      <option key={f.id} value={f.id}>{f.student_name} ({f.roll_number}) - Due: PKR {f.amount - f.total_paid} (Invoice Ref: {f.due_date})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Amount Paid (PKR) *</label>
                  <input
                    type="number"
                    required
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode *</label>
                <div className="select-wrapper">
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    className="form-input"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="online">Easypaisa / JazzCash / Online</option>
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsPaymentOpen(false)} className="btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Posting...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT VOUCHER */}
      {activeInvoice && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in printable-invoice" style={styles.invoiceCard}>
            <div style={styles.invoiceActions} className="no-print">
              <button onClick={handlePrint} className="btn-accent" style={{ fontSize: '0.8rem' }}>
                <Printer size={14} /> Print Receipt
              </button>
              <button onClick={() => setActiveInvoice(null)} style={styles.invoiceClose} className="btn-icon-only">
                <X size={20} />
              </button>
            </div>

            {/* School Header with circular logo */}
            <div style={styles.invoiceHeader}>
              <img 
                src={logoImg} 
                style={styles.invoiceLogo} 
                alt="Dar-ul-Huda circular crest" 
              />
              <h2 style={styles.schoolHeader} className="brand-title">DAR UL HUDA</h2>
              <p style={styles.schoolTag}>Islamic Secondary & Quran Memorization Academy</p>
              <p style={styles.schoolInfo}>Plot 12-A, Gulshan Block, Karachi | Tel: +92 21 34567890</p>
            </div>

            <div style={styles.invoiceMetaBox}>
              <div>
                <h4 style={styles.invoiceMetaTitle}>OFFICIAL BILLING RECEIPT</h4>
                <div style={styles.invoiceMetaRow}><strong>Billing Ref:</strong> INV-{activeInvoice.id.substring(0, 6).toUpperCase()}</div>
                <div style={styles.invoiceMetaRow}><strong>Due Date:</strong> {activeInvoice.due_date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={styles.invoiceMetaRow}><strong>Student Name:</strong> {activeInvoice.student_name}</div>
                <div style={styles.invoiceMetaRow}><strong>Roll Number:</strong> {activeInvoice.roll_number}</div>
                <div style={styles.invoiceMetaRow}><strong>Class Level:</strong> {activeInvoice.class}</div>
              </div>
            </div>

            <table style={styles.invoiceTable}>
              <thead>
                <tr>
                  <th style={styles.invoiceTh}>Fee Period Description</th>
                  <th style={styles.invoiceTh} className="text-right">Invoice Amount</th>
                  <th style={styles.invoiceTh} className="text-right">Sum Settled</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.invoiceTd}>Tuition fee under class level: {activeInvoice.class}</td>
                  <td style={{ ...styles.invoiceTd, textAlign: 'right' }}>PKR {Number(activeInvoice.amount).toLocaleString()}</td>
                  <td style={{ ...styles.invoiceTd, textAlign: 'right', fontWeight: '700' }}>PKR {Number(activeInvoice.total_paid).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Transaction payment list history */}
            <h4 style={styles.subHeading}><History size={13} style={{ marginRight: 5 }} /> Cash Transaction Logs</h4>
            <div style={{ marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Payment Date</th>
                    <th style={{ padding: '0.4rem', textAlign: 'left' }}>Mode</th>
                    <th style={{ padding: '0.4rem', textAlign: 'right' }}>Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsHistory.map(pay => (
                    <tr key={pay.id} style={{ borderBottom: '1px dashed #f1f5f9' }}>
                      <td style={{ padding: '0.4rem' }}>{pay.payment_date}</td>
                      <td style={{ padding: '0.4rem', textTransform: 'uppercase' }}>{pay.payment_mode}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 600 }}>PKR {Number(pay.amount_paid).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.invoiceFooter}>
              <div style={styles.stampBox}>
                <div style={{
                  ...styles.statusStamp,
                  color: activeInvoice.status === 'paid' ? 'var(--color-success)' : 'var(--color-danger)',
                  borderColor: activeInvoice.status === 'paid' ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {activeInvoice.status.toUpperCase()}
                </div>
              </div>

              <div style={styles.signatureBox}>
                <div style={styles.sigLine}></div>
                <p style={styles.sigText}>Authorized Signature</p>
                <p style={{ ...styles.sigText, fontSize: '0.65rem', color: '#94a3b8' }}>Finance Controller</p>
              </div>
            </div>
            
            <p style={styles.invoiceNotice} className="no-print">
              Note: Print receipt formats directly in A4/thermal cash layout.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  filterBar: {
    // Add overdue row style
    // This will be handled via className in JSX
    // No additional CSS needed here

    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
    backgroundColor: '#fff'
  },
  overdueRow: {
    backgroundColor: '#ffcccc',
    color: '#cc0000',
    fontWeight: '600'
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
  invoiceBtn: {
    padding: '0.35rem 0.6rem',
    fontSize: '0.78rem',
    cursor: 'pointer'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    margin: '0.15rem 0'
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
    maxWidth: '520px',
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
  invoiceCard: {
    width: '100%',
    maxWidth: '650px',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    padding: '2.5rem',
    position: 'relative',
    border: '2px solid var(--color-accent-gold)'
  },
  invoiceLogo: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '0.5rem',
    border: '2px solid var(--color-accent-gold)'
  },
  invoiceActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.75rem',
    marginBottom: '1.5rem'
  },
  invoiceClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center'
  },
  invoiceHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  schoolHeader: {
    fontSize: '1.75rem',
    letterSpacing: '0.05em',
    marginBottom: '0.2rem'
  },
  schoolTag: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--color-primary-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    marginBottom: '0.25rem'
  },
  schoolInfo: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)'
  },
  invoiceMetaBox: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-bg-base)',
    padding: '1.1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
    border: '1px solid var(--color-border)',
    fontSize: '0.85rem'
  },
  invoiceMetaTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--color-accent)',
    marginBottom: '0.4rem'
  },
  invoiceMetaRow: {
    marginBottom: '0.2rem',
    color: 'var(--color-text-main)'
  },
  invoiceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '1.5rem'
  },
  invoiceTh: {
    textAlign: 'left',
    padding: '0.6rem 0.8rem',
    borderBottom: '2px solid var(--color-primary)',
    color: 'var(--color-primary)',
    fontWeight: '700',
    fontSize: '0.85rem'
  },
  invoiceTd: {
    padding: '0.8rem',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '0.85rem'
  },
  invoiceTotalRow: {
    borderTop: '2px solid var(--color-border)'
  },
  subHeading: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center'
  },
  invoiceFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1.5rem'
  },
  stampBox: {
    flex: 1
  },
  statusStamp: {
    display: 'inline-block',
    padding: '0.4rem 1.25rem',
    border: '3px double',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '1.25rem',
    letterSpacing: '0.1em',
    transform: 'rotate(-10deg)',
    fontFamily: 'var(--font-sans)',
    textShadow: '1px 1px 2px rgba(0,0,0,0.05)'
  },
  signatureBox: {
    textAlign: 'center',
    width: '200px'
  },
  sigLine: {
    borderBottom: '1px solid var(--color-text-muted)',
    marginBottom: '0.4rem',
    width: '100%'
  },
  sigText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    margin: 0
  },
  invoiceNotice: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '1.5rem',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '0.75rem'
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
  }
};
