import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, Receipt, ArrowUpRight } from 'lucide-react';
import EmptyState from './EmptyState';
import Badge from './Badge';

export default function StudentFeesModule({ user }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeesAndPayments() {
      try {
        setLoading(true);
        if (!user?.id) return;

        // 1. Fetch student record
        const { data: studentRecord, error: studErr } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (studErr) throw studErr;

        if (studentRecord) {
          // 2. Fetch student's fee invoices joined with payments
          const { data: feesData, error: feesErr } = await supabase
            .from('fees')
            .select('*, fee_payments(*)')
            .eq('student_id', studentRecord.id)
            .order('due_date', { ascending: false });

          if (feesErr) throw feesErr;

          const healedFees = [];
          if (feesData) {
            for (const fee of feesData) {
              const sumPaid = (fee.fee_payments || []).reduce((s, p) => s + Number(p.amount_paid), 0);
              if (fee.status === 'unpaid' && sumPaid >= Number(fee.amount)) {
                // Auto-heal status mismatch silently in the background
                supabase
                  .from('fees')
                  .update({ status: 'paid' })
                  .eq('id', fee.id)
                  .then(({ error }) => {
                    if (error) console.error("Error auto-healing student fee status:", error);
                  });
                fee.status = 'paid';
              }
              healedFees.push(fee);
            }
          }

          setInvoices(healedFees);
        }
      } catch (e) {
        console.error("Error loading student fees:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchFeesAndPayments();
  }, [user]);

  // Aggregate stats
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');
  const totalDueAmount = pendingInvoices.reduce((sum, inv) => {
    // For each pending invoice, remaining balance is amount - (sum of payments for this invoice)
    const paidForInvoice = (inv.fee_payments || [])
      .reduce((s, p) => s + Number(p.amount_paid), 0);
    return sum + (Number(inv.amount) - paidForInvoice);
  }, 0);

  return (
    <div className="fade-in">
      <h1 className="section-title">My Fee Voucher Ledger</h1>

      {loading ? (
        <div style={styles.innerLoader}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: 10 }}>Loading fee ledger...</p>
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No fee invoices found"
          message="No tuition fee invoices have been logged for your account yet."
        />
      ) : (
        <div style={styles.container}>
          {/* OVERVIEW STAT CARD */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="glass-panel stat-card">
              <div>
                <span style={styles.statLabel}>Total Outstanding Balance</span>
                <h2 style={styles.statValue} style={{ ...styles.statValue, color: totalDueAmount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  PKR {totalDueAmount.toLocaleString()}
                </h2>
                <span style={styles.statTrend}>
                  {pendingInvoices.length} pending fee voucher(s)
                </span>
              </div>
              <div className="stat-icon red">
                <CreditCard size={24} />
              </div>
            </div>
          </div>

          <div style={styles.listsSection}>
            {/* INVOICES SECTION */}
            <div style={styles.invoicesCard}>
              <h3 style={styles.cardHeaderTitle}><Receipt size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> My Tuition Vouchers</h3>
              <div style={styles.cardsGrid}>
                 {invoices.map(inv => {
                  const invoicePayments = inv.fee_payments || [];
                  const totalPaidForInv = invoicePayments.reduce((s, p) => s + Number(p.amount_paid), 0);
                  const remainingBalance = Number(inv.amount) - totalPaidForInv;
                  const isPaid = inv.status === 'paid';
                  const badgeType = isPaid ? 'success' : (totalPaidForInv > 0 ? 'warning' : 'danger');

                  return (
                    <div key={inv.id} className="glass-panel" style={styles.invCard}>
                      <div style={styles.invCardHeader}>
                        <div>
                          <span style={styles.invMonthLabel}>Voucher Month</span>
                          <h4 style={styles.invTitle}>Invoice Ref: {inv.due_date}</h4>
                        </div>
                        <Badge label={inv.status.toUpperCase()} type={badgeType} />
                      </div>

                      <div style={styles.invBody}>
                        <div style={styles.invRow}>
                          <span style={styles.invLabel}>Voucher Amount:</span>
                          <span style={styles.invValue}>PKR {Number(inv.amount).toLocaleString()}</span>
                        </div>
                        <div style={styles.invRow}>
                          <span style={styles.invLabel}>Total Paid:</span>
                          <span style={{ ...styles.invValue, color: 'var(--color-success)' }}>
                            PKR {totalPaidForInv.toLocaleString()}
                          </span>
                        </div>
                        {remainingBalance > 0 && (
                          <div style={styles.invRow}>
                            <span style={styles.invLabel}>Outstanding Balance:</span>
                            <span style={{ ...styles.invValue, color: 'var(--color-danger)', fontWeight: '700' }}>
                              PKR {remainingBalance.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* PAYMENT ACCORDION FOR THIS VOUCHER */}
                      {invoicePayments.length > 0 && (
                        <div style={styles.historySection}>
                          <span style={styles.historyTitle}><ArrowUpRight size={12} /> Payment History</span>
                          <div style={styles.historyList}>
                            {invoicePayments.map(p => (
                              <div key={p.id} style={styles.historyItem}>
                                <span style={styles.historyItemDate}>{p.payment_date}</span>
                                <span style={styles.historyItemAmt}>PKR {Number(p.amount_paid).toLocaleString()} ({p.payment_mode})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1.75rem',
    margin: '0.2rem 0',
    fontFamily: 'var(--font-sans)',
    fontWeight: '700'
  },
  statTrend: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)'
  },
  listsSection: {
    marginTop: '0.5rem'
  },
  invoicesCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  cardHeaderTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--color-primary)',
    marginBottom: '0.25rem'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  invCard: {
    padding: '1.25rem',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  invCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.75rem'
  },
  invMonthLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    display: 'block'
  },
  invTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    margin: 0
  },
  invBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  invRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem'
  },
  invLabel: {
    color: 'var(--color-text-muted)'
  },
  invValue: {
    fontWeight: '600',
    color: 'var(--color-text-main)'
  },
  historySection: {
    marginTop: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px dotted var(--color-border)'
  },
  historyTitle: {
    fontSize: '0.75rem',
    color: 'var(--color-primary-light)',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '6px'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    padding: '4px 6px',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '4px'
  },
  historyItemDate: {
    color: 'var(--color-text-muted)',
    fontWeight: '500'
  },
  historyItemAmt: {
    fontWeight: '600',
    color: 'var(--color-text-main)'
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
  }
};
