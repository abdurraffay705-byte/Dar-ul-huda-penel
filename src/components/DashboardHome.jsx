import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { database, supabase } from '../supabaseClient';
import { 
  Users, 
  UserSquare2, 
  CreditCard, 
  HeartHandshake, 
  ArrowUpRight, 
  TrendingUp,
  Bell
} from 'lucide-react';
import EmptyState from './EmptyState';
import Badge from './Badge';


export default function DashboardHome({ setActiveTab }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    studentsCount: 0,
    teachersCount: 0,
    feesCollected: 0,
    donationsTotal: 0
  });
  const [notices, setNotices] = useState([]);
  const [recentFees, setRecentFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([
    { month: 'Jan', amount: 0 },
    { month: 'Feb', amount: 0 },
    { month: 'Mar', amount: 0 },
    { month: 'Apr', amount: 0 },
    { month: 'May', amount: 0 },
    { month: 'Jun', amount: 0 }
  ]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [studentsList, teachersList, feesList, donationsList, noticesList] = await Promise.all([
          database.students.list(),
          database.teachers.list(),
          database.fees.list(),
          database.donations.list(),
          database.cms.list()
        ]);

        const totalStudents = studentsList.length;
        const totalTeachers = teachersList.length;
        
        // Sum paid fee amounts across invoice logs (fees has status 'paid' | 'unpaid')
        // In authoritative schema, actual collections are represented by fee_payments records
        // Let's load fee payments and sum their amounts!
        let totalPaidFees = 0;
        const feesPaymentsAccumulator = [];
        
        for (const fee of feesList) {
          const payments = await database.fees.paymentsList(fee.id);
          payments.forEach(p => {
            totalPaidFees += Number(p.amount_paid);
            feesPaymentsAccumulator.push({
              id: p.id,
              student_name: fee.student_name,
              roll_number: fee.roll_number,
              amount_paid: p.amount_paid,
              payment_date: p.payment_date,
              fee_month: 'Invoice Ref: ' + fee.due_date
            });
          });
        }
          
        // Sum donations
        const totalDonations = donationsList.reduce((sum, d) => sum + Number(d.amount), 0);

        setStats({
          studentsCount: totalStudents,
          teachersCount: totalTeachers,
          feesCollected: totalPaidFees,
          donationsTotal: totalDonations
        });

        // Set top 3 active notices
        setNotices(noticesList.slice(0, 3));
        
        // Set top 4 recent fee payments
        feesPaymentsAccumulator.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
        setRecentFees(feesPaymentsAccumulator.slice(0, 4));

        // Fetch all fee payments from Supabase for the trend chart
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('fee_payments')
          .select('amount_paid, payment_date');

        if (paymentsError) throw paymentsError;

        const monthlySums = {
          'Jan': 0,
          'Feb': 0,
          'Mar': 0,
          'Apr': 0,
          'May': 0,
          'Jun': 0
        };

        if (paymentsData) {
          paymentsData.forEach(p => {
            if (!p.payment_date) return;
            const parts = p.payment_date.split('-');
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            
            if (year === 2026) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthName = monthNames[monthIndex];
              if (monthlySums[monthName] !== undefined) {
                monthlySums[monthName] += Number(p.amount_paid);
              }
            }
          });
        }

        const constructedChartData = Object.keys(monthlySums).map(month => ({
          month,
          amount: monthlySums[month]
        }));
        setChartData(constructedChartData);
      } catch (e) {
        console.error("Error loading dashboard metrics:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: 15, color: 'var(--color-primary)' }}>Loading statistics dashboard...</p>
      </div>
    );
  }

  // Chart parameters
  
  const maxAmount = Math.max(...chartData.map(d => d.amount));
  const chartHeight = 150;
  const chartWidth = 360;

  return (
    <div className="fade-in">
      <div style={styles.header}>
        <div>
          <h1 style={styles.greeting} className="brand-title">Dashboard</h1>
          <p style={styles.greetingSub}>Islamic Academic Excellence & Governance Portal</p>
        </div>
        <div style={styles.dateBadge}>
          Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card" onClick={() => { setActiveTab('students'); navigate('/students'); }} style={{ cursor: 'pointer' }}>
          <div>
            <span style={styles.statLabel}>Total Students</span>
            <h2 style={styles.statValue}>{stats.studentsCount}</h2>
            <span style={styles.statTrend}><TrendingUp size={12} /> View roster</span>
          </div>
          <div className="stat-icon green">
            <Users size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card" onClick={() => { setActiveTab('teachers'); navigate('/teachers'); }} style={{ cursor: 'pointer' }}>
          <div>
            <span style={styles.statLabel}>Instructors / Staff</span>
            <h2 style={styles.statValue}>{stats.teachersCount}</h2>
            <span style={styles.statTrend}><TrendingUp size={12} /> View registry</span>
          </div>
          <div className="stat-icon blue">
            <UserSquare2 size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card" onClick={() => { setActiveTab('fees'); navigate('/fees'); }} style={{ cursor: 'pointer' }}>
          <div>
            <span style={styles.statLabel}>Tuition Fees Received</span>
            <h2 style={styles.statValue}>PKR {stats.feesCollected.toLocaleString()}</h2>
            <span style={styles.statTrend}><TrendingUp size={12} /> Billing collections</span>
          </div>
          <div className="stat-icon">
            <CreditCard size={24} />
          </div>
        </div>

        <div className="glass-panel stat-card" onClick={() => { setActiveTab('donations'); navigate('/donations'); }} style={{ cursor: 'pointer' }}>
          <div>
            <span style={styles.statLabel}>Donation Funds</span>
            <h2 style={styles.statValue}>PKR {stats.donationsTotal.toLocaleString()}</h2>
            <span style={styles.statTrend}><TrendingUp size={12} /> Campaigns ledger</span>
          </div>
          <div className="stat-icon red">
            <HeartHandshake size={24} />
          </div>
        </div>
      </div>

      {/* DATA VISUALIZATION & LOGS SECTION */}
      <div className="dashboard-middle-section">
        {/* PREMIUM SVG CHART CARD */}
        <div className="glass-panel" style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Fee Collection Trend (2026)</h3>
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowUpRight size={14} /> +12% this month
            </span>
          </div>
          
          <div style={styles.svgWrapper}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%' }}>
              {/* Grid Lines */}
              <line x1="30" y1="20" x2={chartWidth - 10} y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="70" x2={chartWidth - 10} y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="120" x2={chartWidth - 10} y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="140" x2={chartWidth - 10} y2="140" stroke="#cbd5e1" strokeWidth="1.5" />
              
              {/* Bars */}
              {chartData.map((d, index) => {
                const colWidth = (chartWidth - 40) / chartData.length;
                const x = 40 + index * colWidth;
                const barHeight = (d.amount / maxAmount) * (chartHeight - 40);
                const y = chartHeight - 20 - barHeight;
                
                return (
                  <g key={d.month}>
                    {/* Gradient Bar */}
                    <rect
                      x={x + 10}
                      y={y}
                      width={colWidth - 20}
                      height={barHeight}
                      rx="4"
                      fill="url(#greenGrad)"
                      style={{ transition: 'all 0.5s ease' }}
                    />
                    {/* Month Label */}
                    <text
                      x={x + colWidth / 2}
                      y={chartHeight - 4}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {d.month}
                    </text>
                    {/* Value hover text */}
                    <text
                      x={x + colWidth / 2}
                      y={y - 5}
                      fontSize="8"
                      fill="#064e3b"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {Math.round(d.amount / 1000)}k
                    </text>
                  </g>
                );
              })}
              
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* RECENT PAYMENTS CARD */}
        <div className="glass-panel" style={styles.recentCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Recent Payments Ledger</h3>
            <button onClick={() => { setActiveTab('fees'); navigate('/fees'); }} style={styles.viewAllBtn}>
              Manage Fees
            </button>
          </div>
          
          <div style={styles.listContainer}>
            {recentFees.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No recent payments"
                message="No payment transactions have been logged in the ledger yet."
              />
            ) : (
              recentFees.map((pay) => (
                <div key={pay.id} style={styles.listItem}>
                  <div>
                    <span style={styles.listItemName}>
                      {pay.student_name}
                    </span>
                    <span style={styles.listItemSub}>{pay.roll_number} • {pay.payment_date}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={styles.listItemAmount}>PKR {Number(pay.amount_paid).toLocaleString()}</span>
                    <div>
                      <Badge label="Received" type="success" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* NOTICES BANNER */}
      <div className="glass-panel" style={styles.noticesCard}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}><Bell size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--color-accent)' }} /> Active Notices & Announcements</h3>
          <button onClick={() => { setActiveTab('cms'); navigate('/cms'); }} style={styles.viewAllBtn}>
            Notice Editor
          </button>
        </div>

        <div style={styles.noticesGrid}>
          {notices.length === 0 ? (
            <p style={styles.emptyText}>No active notices posted on the CMS.</p>
          ) : (
            notices.map((n) => (
              <div key={n.id} style={{
                ...styles.noticeItem,
                borderLeftColor: n.urgency === 'High' ? 'var(--color-danger)' : (n.urgency === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)')
              }}>
                <div style={styles.noticeMeta}>
                  <span className={`badge ${n.urgency === 'High' ? 'danger' : (n.urgency === 'Medium' ? 'warning' : 'info')}`} style={{ fontSize: '0.65rem' }}>
                    {n.urgency} Priority
                  </span>
                  <span style={styles.noticeDate}>{n.published_date}</span>
                </div>
                <h4 style={styles.noticeTitle}>{n.title}</h4>
                <p style={styles.noticeContent}>{n.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  greeting: {
    fontSize: '2rem',
    margin: 0,
    lineHeight: 1.2
  },
  greetingSub: {
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem'
  },
  dateBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#fff',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--color-primary-light)',
    boxShadow: 'var(--shadow-sm)'
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1.75rem',
    color: 'var(--color-primary)',
    margin: '0.2rem 0',
    fontFamily: 'var(--font-sans)',
    fontWeight: '700'
  },
  statTrend: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  // Styles moved to .dashboard-middle-section in index.css
  chartCard: {
    padding: '1.5rem',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  recentCard: {
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--color-primary)'
  },
  svgWrapper: {
    height: '160px',
    marginTop: '1rem'
  },
  viewAllBtn: {
    fontSize: '0.8rem',
    padding: '0.3rem 0.6rem',
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-primary)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.65rem 0.8rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid #f1f5f9'
  },
  listItemName: {
    fontWeight: '600',
    fontSize: '0.85rem',
    display: 'block'
  },
  listItemSub: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)'
  },
  listItemAmount: {
    fontWeight: '700',
    fontSize: '0.85rem',
    color: 'var(--color-primary)'
  },
  noticesCard: {
    padding: '1.5rem',
    backgroundColor: '#fff',
    marginTop: '1.5rem'
  },
  noticesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  noticeItem: {
    padding: '1.1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    borderLeft: '4px solid #cbd5e1',
    borderTop: '1px solid #f1f5f9',
    borderRight: '1px solid #f1f5f9',
    borderBottom: '1px solid #f1f5f9'
  },
  noticeMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  noticeDate: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500'
  },
  noticeTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    marginBottom: '0.4rem',
    color: 'var(--color-primary)'
  },
  noticeContent: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
    margin: '2rem 0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '250px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--color-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
