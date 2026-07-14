import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, UserCheck, Search, Award } from 'lucide-react';
import EmptyState from './EmptyState';
import Badge from './Badge';

export default function StudentAttendanceModule({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchAttendance() {
      try {
        setLoading(true);
        if (!user?.id) return;

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (e) {
        console.error("Error loading student attendance:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, [user]);

  // Stats calculation
  const totalDays = logs.length;
  const presentCount = logs.filter(l => l.status === 'present').length;
  const absentCount = logs.filter(l => l.status === 'absent').length;
  const lateCount = logs.filter(l => l.status === 'late').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 0;

  const filteredLogs = logs.filter(l => {
    return l.date.includes(search);
  });

  return (
    <div className="fade-in">
      <h1 className="section-title">My Attendance History</h1>

      {loading ? (
        <div style={styles.innerLoader}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: 10 }}>Loading attendance record...</p>
        </div>
      ) : (
        <div style={styles.container}>
          {/* STATS ROW */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="glass-panel stat-card">
              <div>
                <span style={styles.statLabel}>Attendance Rate</span>
                <h2 style={styles.statValue}>{attendanceRate}%</h2>
                <span style={styles.statTrend}><Award size={12} /> Performance index</span>
              </div>
              <div className="stat-icon green">
                <UserCheck size={24} />
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div>
                <span style={styles.statLabel}>Total Days Logged</span>
                <h2 style={styles.statValue}>{totalDays}</h2>
                <span style={styles.statTrend}>School session days</span>
              </div>
              <div className="stat-icon blue">
                <Calendar size={24} />
              </div>
            </div>

            <div className="glass-panel stat-card">
              <div>
                <span style={styles.statLabel}>Status Breakdown</span>
                <div style={styles.breakdown}>
                  <span style={styles.breakdownItem}><span style={styles.dotPresent} /> {presentCount} Present</span>
                  <span style={styles.breakdownItem}><span style={styles.dotLate} /> {lateCount} Late</span>
                  <span style={styles.breakdownItem}><span style={styles.dotAbsent} /> {absentCount} Absent</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE LOGS */}
          <div className="glass-panel" style={styles.tableCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> My Attendance Logs</h3>
              <div style={styles.searchBox}>
                <Search size={14} color="#64748b" />
                <input autoComplete="off"
                  type="text"
                  placeholder="Filter by date (YYYY-MM-DD)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
            </div>

            <div style={styles.tableContainer}>
              {filteredLogs.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No attendance logs found"
                  message="No attendance logs have been recorded for your account yet."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => {
                      const dayName = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' });
                      const statusType = log.status === 'present' ? 'success' : (log.status === 'late' ? 'warning' : 'danger');
                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: '600' }}>{log.date}</td>
                          <td>{dayName}</td>
                          <td>
                            <Badge label={log.status.toUpperCase()} type={statusType} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
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
  breakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '6px'
  },
  breakdownItem: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  dotPresent: { width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' },
  dotLate: { width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-warning)' },
  dotAbsent: { width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-danger)' },
  tableCard: {
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--color-primary)'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.4rem 0.6rem',
    minWidth: '220px',
    backgroundColor: '#fff'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.85rem',
    width: '100%',
    color: 'var(--color-text-main)'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '0.5rem'
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
