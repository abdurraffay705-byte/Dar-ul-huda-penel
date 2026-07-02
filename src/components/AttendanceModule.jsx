import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { CheckSquare, Calendar, UserCheck, Search, Info, Trash2 } from 'lucide-react';

export default function AttendanceModule({ userRole }) {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'teacher' | 'reports'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('Grade 1');
  
  // High-performance local attendance states
  const [attendanceSheet, setAttendanceSheet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Report specific states
  const [reportRole, setReportRole] = useState('student'); // 'student' | 'teacher'
  const [people, setPeople] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportLogs, setReportLogs] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Load roster and dynamic status logs
  const loadRoster = async () => {
    try {
      setLoading(true);
      if (activeTab === 'student') {
        const studentRoster = await database.students.list();
        const activeStudents = studentRoster.filter(s => s.class === selectedClass);
        
        // Load logged attendance for this date (student)
        const loggedAtt = await database.attendance.list(date, 'student');
        
        // Construct sheet mapping student user IDs
        const sheet = activeStudents.map(student => {
          const matched = loggedAtt.find(a => a.user_id === student.user_id);
          return {
            id: student.user_id,
            attendanceId: matched?.id || null,
            roll_no: student.roll_number,
            name: student.full_name,
            status: matched ? matched.status.toLowerCase() : 'present'
          };
        });
        setAttendanceSheet(sheet);
      } else {
        const teacherRoster = await database.teachers.list();
        
        // Load logged attendance
        const loggedAtt = await database.attendance.list(date, 'teacher');
        
        // Construct sheet
        const sheet = teacherRoster.map(teacher => {
          const matched = loggedAtt.find(a => a.user_id === teacher.user_id);
          return {
            id: teacher.user_id,
            attendanceId: matched?.id || null,
            roll_no: 'TEA-REF',
            name: teacher.full_name,
            status: matched ? matched.status.toLowerCase() : 'present'
          };
        });
        setAttendanceSheet(sheet);
      }
    } catch (e) {
      console.error("Error loading attendance roster:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadRoster();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, date, selectedClass]);

  const handleStatusChange = (userId, status) => {
    setAttendanceSheet(prev => 
      prev.map(row => row.id === userId ? { ...row, status: status.toLowerCase() } : row)
    );
  };

  const handleBulkMark = (status) => {
    setAttendanceSheet(prev => 
      prev.map(row => ({ ...row, status: status.toLowerCase() }))
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await database.attendance.saveBulk(date, activeTab, attendanceSheet);
      if (res.success) {
        alert(`Successfully logged ${activeTab} attendance for ${date}!`);
        loadRoster();
      } else {
        alert("Failed to save daily check sheet: " + res.error);
      }
    } catch (e) {
      console.error("Error saving attendance sheet:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSheetRecord = async (attendanceId, userId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    const res = await database.attendance.delete(attendanceId);
    if (res.success) {
      setAttendanceSheet(prev =>
        prev.map(row =>
          row.id === userId
            ? { ...row, attendanceId: null, status: 'present' }
            : row
        )
      );
    } else {
      alert('Failed to delete attendance record: ' + res.error);
    }
  };

  const handleDeleteReportLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    const res = await database.attendance.delete(logId);
    if (res.success) {
      setReportLogs(prev => prev.filter(log => log.id !== logId));
    } else {
      alert('Failed to delete attendance record: ' + res.error);
    }
  };

  // Load students/teachers list for report dropdown
  useEffect(() => {
    if (activeTab === 'reports') {
      (async () => {
        try {
          setReportLoading(true);
          let list = [];
          if (reportRole === 'student') {
            const data = await database.students.list();
            list = data.map(s => ({
              id: s.user_id,
              name: s.full_name,
              details: `Roll: ${s.roll_number} | ${s.class}`
            }));
          } else {
            const data = await database.teachers.list();
            list = data.map(t => ({
              id: t.user_id,
              name: t.full_name,
              details: `Subject: ${t.subject}`
            }));
          }
          setPeople(list);
          if (list.length > 0) {
            setSelectedUserId(list[0].id);
          } else {
            setSelectedUserId('');
          }
        } catch (e) {
          console.error("Error loading report people:", e);
        } finally {
          setReportLoading(false);
        }
      })();
    }
  }, [activeTab, reportRole]);

  const handleRunReport = async () => {
    if (!selectedUserId) {
      alert("Please select a person first.");
      return;
    }
    try {
      setReportLoading(true);
      const data = await database.attendance.listForUserInDateRange(selectedUserId, startDate, endDate);
      setReportLogs(data);
    } catch (e) {
      console.error("Error running attendance report:", e);
      alert("Failed to load report: " + e.message);
    } finally {
      setReportLoading(false);
    }
  };

  // Calculations
  const totalRoster = attendanceSheet.length;
  const presentCount = attendanceSheet.filter(a => a.status === 'present').length;
  const absentCount = attendanceSheet.filter(a => a.status === 'absent').length;
  const lateCount = attendanceSheet.filter(a => a.status === 'late').length;
  const attendanceRate = totalRoster > 0 ? Math.round((presentCount / totalRoster) * 100) : 0;

  const filteredSheet = attendanceSheet.filter(row => 
    row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isEditable = userRole === 'admin' || userRole === 'teacher';

  return (
    <div className="fade-in">
      <h1 className="section-title"><CheckSquare size={24} color="var(--color-accent)" /> Attendance Management</h1>

      {/* DOUBLE TAB MENU */}
      <div style={styles.tabContainer}>
        <button 
          onClick={() => { setActiveTab('student'); setSearchTerm(''); }}
          style={{ ...styles.tabBtn, ...(activeTab === 'student' ? styles.tabBtnActive : {}) }}
        >
          Students Attendance
        </button>
        <button 
          onClick={() => { setActiveTab('teacher'); setSearchTerm(''); }}
          style={{ ...styles.tabBtn, ...(activeTab === 'teacher' ? styles.tabBtnActive : {}) }}
        >
          Teachers & Staff Attendance
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setSearchTerm(''); }}
          style={{ ...styles.tabBtn, ...(activeTab === 'reports' ? styles.tabBtnActive : {}) }}
        >
          History & Reports
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div style={styles.sheetContainer} className="glass-panel">
          <h3 style={{ ...styles.sheetTitle, marginBottom: '1.25rem' }}>Attendance History & Reports</h3>
          
          <div style={styles.configBar} className="glass-panel">
            <div style={styles.configItem}>
              <label style={styles.configLabel}>Role Filter</label>
              <select
                value={reportRole}
                onChange={(e) => setReportRole(e.target.value)}
                style={styles.configInput}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Staff</option>
              </select>
            </div>

            <div style={styles.configItem}>
              <label style={styles.configLabel}>Select Person</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={styles.configInput}
                disabled={people.length === 0}
              >
                {people.length === 0 ? (
                  <option value="">No registry found</option>
                ) : (
                  people.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.details})</option>
                  ))
                )}
              </select>
            </div>

            <div style={styles.configItem}>
              <label style={styles.configLabel}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.configInput}
              />
            </div>

            <div style={styles.configItem}>
              <label style={styles.configLabel}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.configInput}
              />
            </div>

            <button 
              onClick={handleRunReport} 
              className="btn-accent" 
              style={{ marginTop: 'auto', padding: '0.45rem 1.25rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={reportLoading || !selectedUserId}
            >
              Generate Report
            </button>
          </div>

          {reportLoading ? (
            <div style={styles.innerLoader}>
              <div className="spinner" style={styles.spinner}></div>
              <p style={{ marginTop: 10 }}>Querying ledger logs...</p>
            </div>
          ) : reportLogs.length === 0 ? (
            <div style={styles.noData}>No records found for the selected criteria and date range.</div>
          ) : (
            <div className="table-container" style={{ marginTop: '1.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance Status</th>
                    {isEditable && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: '600', color: 'var(--color-primary-light)' }}>{log.date}</td>
                      <td>
                        <span className={`badge ${log.status === 'present' ? 'success' : (log.status === 'absent' ? 'danger' : 'warning')}`}>
                          {log.status}
                        </span>
                      </td>
                      {isEditable && (
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => handleDeleteReportLog(log.id)} style={styles.deleteBtn} title="Delete record">
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ATTENDANCE CONFIGURATION BOARD */}
          <div style={styles.configBar} className="glass-panel">
            <div style={styles.configItem}>
              <label style={styles.configLabel}><Calendar size={14} style={{ marginRight: 4 }} /> Date Ledger</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={styles.configInput}
              />
            </div>

            {activeTab === 'student' && (
              <div style={styles.configItem}>
                <label style={styles.configLabel}><Info size={14} style={{ marginRight: 4 }} /> Select Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={styles.configInput}
                >
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Hifz">Hifz</option>
                  <option value="Nazra">Nazra</option>
                </select>
              </div>
            )}

            <div style={{ ...styles.configItem, flex: 1, minWidth: '180px' }}>
              <label style={styles.configLabel}><Search size={14} style={{ marginRight: 4 }} /> Search Registry</label>
              <input
                type="text"
                placeholder="Search by name, roll/employee id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.configInput}
              />
            </div>
          </div>

          {/* QUICK ATTENDANCE STATS BANNER */}
          {!loading && totalRoster > 0 && (
            <div style={styles.statsBanner} className="glass-panel">
              <div style={styles.statMetric}>
                <span style={styles.statMetricLabel}>Total Registered</span>
                <span style={styles.statMetricValue}>{totalRoster}</span>
              </div>
              <div style={styles.statMetric}>
                <span style={styles.statMetricLabel}>Present</span>
                <span style={{ ...styles.statMetricValue, color: 'var(--color-success)' }}>{presentCount}</span>
              </div>
              <div style={styles.statMetric}>
                <span style={styles.statMetricLabel}>Late Arrivals</span>
                <span style={{ ...styles.statMetricValue, color: 'var(--color-warning)' }}>{lateCount}</span>
              </div>
              <div style={styles.statMetric}>
                <span style={styles.statMetricLabel}>Absent</span>
                <span style={{ ...styles.statMetricValue, color: 'var(--color-danger)' }}>{absentCount}</span>
              </div>
              <div style={styles.statMetric}>
                <span style={styles.statMetricLabel}>Attendance Rate</span>
                <span style={{ ...styles.statMetricValue, color: 'var(--color-primary)' }}>{attendanceRate}%</span>
              </div>
            </div>
          )}

          {/* RAPID CHECKMARK INTERFACE */}
          <div style={styles.sheetContainer} className="glass-panel">
            <div style={styles.bulkRow}>
              <h3 style={styles.sheetTitle}>Marking Ledger Roster</h3>
              <div style={styles.bulkActions}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Bulk Fill:</span>
                <button onClick={() => handleBulkMark('present')} style={styles.bulkBtnGreen}>Mark Present</button>
                <button onClick={() => handleBulkMark('absent')} style={styles.bulkBtnRed}>Mark Absent</button>
              </div>
            </div>

            {loading ? (
              <div style={styles.innerLoader}>
                <div className="spinner" style={styles.spinner}></div>
                <p style={{ marginTop: 10 }}>Fetching daily check sheets...</p>
              </div>
            ) : filteredSheet.length === 0 ? (
              <div style={styles.noData}>No active records registered under current settings.</div>
            ) : (
              <div style={styles.gridList}>
                {filteredSheet.map((row) => (
                  <div key={row.id} style={styles.gridRow}>
                    <div style={styles.rowBio}>
                      <span style={styles.rowRoll}>{row.roll_no}</span>
                      <span style={styles.rowName}>{row.name}</span>
                    </div>

                    {/* STATUS BUTTON GROUP */}
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => handleStatusChange(row.id, 'present')}
                        style={{
                          ...styles.statusBtn,
                          backgroundColor: row.status === 'present' ? 'var(--color-success)' : '#fff',
                          color: row.status === 'present' ? '#fff' : '#475569',
                          borderColor: row.status === 'present' ? 'var(--color-success)' : 'var(--color-border)'
                        }}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleStatusChange(row.id, 'absent')}
                        style={{
                          ...styles.statusBtn,
                          backgroundColor: row.status === 'absent' ? 'var(--color-danger)' : '#fff',
                          color: row.status === 'absent' ? '#fff' : '#475569',
                          borderColor: row.status === 'absent' ? 'var(--color-danger)' : 'var(--color-border)'
                        }}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => handleStatusChange(row.id, 'late')}
                        style={{
                          ...styles.statusBtn,
                          backgroundColor: row.status === 'late' ? 'var(--color-warning)' : '#fff',
                          color: row.status === 'late' ? '#fff' : '#475569',
                          borderColor: row.status === 'late' ? 'var(--color-warning)' : 'var(--color-border)'
                        }}
                      >
                        Late
                      </button>
                    </div>

                    {isEditable && row.attendanceId && (
                      <button
                        onClick={() => handleDeleteSheetRecord(row.attendanceId, row.id)}
                        style={styles.deleteBtn}
                        title="Delete saved record"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalRoster > 0 && !loading && (
              <div style={styles.sheetFooter}>
                <button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="btn-accent"
                  style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <UserCheck size={18} /> {saving ? 'Writing Database...' : 'Save & Publish Ledger'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '2px solid var(--color-border)',
    marginBottom: '1.5rem'
  },
  tabBtn: {
    padding: '0.75rem 1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s',
    borderBottom: '3px solid transparent'
  },
  tabBtnActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)'
  },
  configBar: {
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginBottom: '1.5rem',
    backgroundColor: '#fff',
    flexWrap: 'wrap'
  },
  configItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  configLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center'
  },
  configInput: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.45rem 0.75rem',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#fff',
    minWidth: '160px'
  },
  statsBanner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '1rem',
    padding: '1rem 1.5rem',
    backgroundColor: '#fff',
    marginBottom: '1.5rem',
    textAlign: 'center',
    '@media (max-width: 600px)': {
      gridTemplateColumns: 'repeat(2, 1fr)'
    }
  },
  statMetric: {
    display: 'flex',
    flexDirection: 'column'
  },
  statMetricLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },
  statMetricValue: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--color-text-main)'
  },
  sheetContainer: {
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  bulkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  sheetTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  bulkBtnGreen: {
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--color-success)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  bulkBtnRed: {
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '4px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  gridList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  gridRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid #f1f5f9',
    gap: '1.25rem',
    flexWrap: 'wrap'
  },
  rowBio: {
    flex: 1,
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column'
  },
  rowRoll: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-primary-light)'
  },
  rowName: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--color-text-main)'
  },
  btnGroup: {
    display: 'flex',
    gap: '0.35rem',
    flexWrap: 'wrap'
  },
  statusBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: '76px'
  },
  sheetFooter: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '1.25rem',
    display: 'flex',
    justifyContent: 'flex-end'
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
    transition: 'all 0.15s',
    flexShrink: 0
  }
};
