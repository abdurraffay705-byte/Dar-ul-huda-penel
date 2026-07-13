import { useState, useEffect } from 'react';
import { database, supabase } from '../supabaseClient';
import { CheckSquare, Calendar, UserCheck, Search, Info, Trash2, ChevronDown, Users } from 'lucide-react';
import EmptyState from './EmptyState';

export default function AttendanceModule({ userRole, user }) {
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
  const [hasQueried, setHasQueried] = useState(false);

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
      prev.map(row => {
        if (row.id === userId) {
          if (isStatusDisabled(row)) {
            return row;
          }
          return { ...row, status: status.toLowerCase() };
        }
        return row;
      })
    );
  };

  const handleBulkMark = (status) => {
    setAttendanceSheet(prev => 
      prev.map(row => {
        if (isStatusDisabled(row)) {
          return row;
        }
        return { ...row, status: status.toLowerCase() };
      })
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
      setHasQueried(true);
    } catch (e) {
      console.error("Error running attendance report:", e);
      alert("Failed to load report: " + e.message);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    setHasQueried(false);
    setReportLogs([]);
  }, [activeTab, reportRole, selectedUserId, startDate, endDate]);

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

  const [teacherSubject, setTeacherSubject] = useState('');

  useEffect(() => {
    async function fetchTeacherSubject() {
      const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
      if (norm === 'teacher' && user?.id) {
        try {
          const { data, error } = await supabase
            .from('teachers')
            .select('subject')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) {
            setTeacherSubject(data.subject);
          }
        } catch (e) {
          console.error("Error fetching teacher subject:", e);
        }
      }
    }
    fetchTeacherSubject();
  }, [userRole, user]);

  const isStatusDisabled = (row) => {
    const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
    if (norm === 'admin') return false;
    if (norm === 'data_entry') {
      return false;
    }
    if (norm === 'teacher') {
      if (activeTab === 'student') {
        return !(selectedClass && teacherSubject && (
          selectedClass.toLowerCase().includes(teacherSubject.toLowerCase()) ||
          teacherSubject.toLowerCase().includes(selectedClass.toLowerCase())
        ));
      } else {
        return row.id !== user?.id;
      }
    }
    return true;
  };

  const isEditable = (userRole?.toLowerCase().replace(/[- ]/g, '_') || '') === 'admin';
  const isRosterHidden = !loading && totalRoster === 0;
  const isReportEmpty = !reportLoading && reportLogs.length === 0;

  return (
    <div className="fade-in">
      <h1 className="section-title">Attendance Ledger</h1>

      {/* DOUBLE TAB MENU */}
      <div className="attendance-tabs">
        <button 
          onClick={() => { setActiveTab('student'); setSearchTerm(''); }}
          className={`attendance-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
        >
          Students Attendance
        </button>
        <button 
          onClick={() => { setActiveTab('teacher'); setSearchTerm(''); }}
          className={`attendance-tab-btn ${activeTab === 'teacher' ? 'active' : ''}`}
        >
          Teachers & Staff Attendance
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setSearchTerm(''); }}
          className={`attendance-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
        >
          History & Reports
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div style={isReportEmpty ? {} : styles.sheetContainer} className={isReportEmpty ? "" : "glass-panel"}>
          {!isReportEmpty && (
            <h3 style={{ ...styles.sheetTitle, marginBottom: '1.25rem' }}>Attendance History & Reports</h3>
          )}
          
          <div 
            style={isReportEmpty ? styles.configBarExpanded : styles.configBar} 
            className="glass-panel filter-bar"
          >
            {isReportEmpty && (
              <h3 style={{ ...styles.sheetTitle, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                <Search size={18} color="var(--color-primary-light)" /> Attendance History & Reports Query
              </h3>
            )}

            <div style={styles.configItem}>
              <label style={styles.configLabel}>Role Filter</label>
              <div className="select-wrapper">
                <select
                  value={reportRole}
                  onChange={(e) => setReportRole(e.target.value)}
                  style={isReportEmpty ? styles.configInputExpanded : styles.configInput}
                >
                  <option value="student">Student Registry</option>
                  <option value="teacher">Teachers & Staff</option>
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div style={isReportEmpty ? styles.configItem : { ...styles.configItem, flex: 1 }}>
              <label style={styles.configLabel}>Select Person Profile</label>
              <div className="select-wrapper">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  style={isReportEmpty ? styles.configInputExpanded : styles.configInput}
                  disabled={reportLoading}
                >
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.details})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>

            <div style={styles.configItem}>
              <label style={styles.configLabel}>Start Date</label>
              <input autoComplete="off"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={isReportEmpty ? styles.configInputExpanded : styles.configInput}
              />
            </div>

            <div style={styles.configItem}>
              <label style={styles.configLabel}>End Date</label>
              <input autoComplete="off"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={isReportEmpty ? styles.configInputExpanded : styles.configInput}
              />
            </div>

            <button 
              onClick={handleRunReport}
              disabled={reportLoading}
              className="btn-primary"
              style={isReportEmpty ? { width: '100%', marginTop: '0.5rem', justifyContent: 'center' } : { alignSelf: 'flex-end' }}
            >
              <Search size={16} /> Run Report Ledger
            </button>
          </div>

          {reportLoading ? (
            <div style={styles.innerLoader}>
              <div className="spinner" style={styles.spinner}></div>
              <p style={{ marginTop: 10 }}>Querying ledger logs...</p>
            </div>
          ) : reportLogs.length > 0 ? (
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
          ) : hasQueried ? (
            <div style={{ marginTop: '1.5rem' }}>
              <EmptyState
                icon={Calendar}
                title="No attendance history"
                message="No attendance records found for this profile in the selected date range."
              />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {/* ATTENDANCE CONFIGURATION BOARD */}
          <div 
            style={isRosterHidden ? styles.configBarExpanded : styles.configBar} 
            className="glass-panel filter-bar"
          >
            {isRosterHidden && (
              <h3 style={{ ...styles.sheetTitle, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                <Search size={18} color="var(--color-primary-light)" /> Attendance Ledger Query
              </h3>
            )}
            
            <div style={styles.configItem}>
              <label style={styles.configLabel}><Calendar size={14} style={{ marginRight: 4 }} /> Date Ledger</label>
              <input autoComplete="off"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={isRosterHidden ? styles.configInputExpanded : styles.configInput}
              />
            </div>

            {activeTab === 'student' && (
              <div style={styles.configItem}>
                <label style={styles.configLabel}><Info size={14} style={{ marginRight: 4 }} /> Select Class</label>
                <div className="select-wrapper">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    style={isRosterHidden ? styles.configInputExpanded : styles.configInput}
                  >
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Hifz">Hifz</option>
                    <option value="Nazra">Nazra</option>
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>
            )}

            <div style={isRosterHidden ? styles.configItem : { ...styles.configItem, flex: 1, minWidth: '180px' }}>
              <label style={styles.configLabel}><Search size={14} style={{ marginRight: 4 }} /> Search Registry</label>
              <input autoComplete="off"
                type="text"
                placeholder="Search by name, roll/employee id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={isRosterHidden ? styles.configInputExpanded : styles.configInput}
              />
            </div>
          </div>

          {/* QUICK ATTENDANCE STATS BANNER */}
          {!loading && totalRoster > 0 && (
            <div className="attendance-stats-banner glass-panel">
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
          {(loading || totalRoster > 0) && (
            <div style={styles.sheetContainer} className="glass-panel">
              <div style={styles.bulkRow}>
                <h3 style={styles.sheetTitle}>Marking Ledger Roster</h3>
                <div style={styles.bulkActions}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Bulk Fill:</span>
                  <button onClick={() => handleBulkMark('present')} style={styles.bulkBtnGreen} className="btn-sm">Mark Present</button>
                  <button onClick={() => handleBulkMark('absent')} style={styles.bulkBtnRed} className="btn-sm">Mark Absent</button>
                </div>
              </div>

              {loading ? (
                <div style={styles.innerLoader}>
                  <div className="spinner" style={styles.spinner}></div>
                  <p style={{ marginTop: 10 }}>Fetching daily check sheets...</p>
                </div>
              ) : filteredSheet.length === 0 ? (
                <EmptyState
                  icon={attendanceSheet.length === 0 ? Users : Search}
                  title={attendanceSheet.length === 0 ? "No registry records" : "No matching roster records"}
                  message={attendanceSheet.length === 0 
                    ? "No students or staff are registered under the current class/role selection." 
                    : "Try adjusting your search criteria."}
                />
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
                          disabled={isStatusDisabled(row)}
                          className="btn-sm"
                          style={{
                            ...styles.statusBtn,
                            backgroundColor: row.status === 'present' ? 'var(--color-success)' : '#fff',
                            color: row.status === 'present' ? '#fff' : '#475569',
                            borderColor: row.status === 'present' ? 'var(--color-success)' : 'var(--color-border)',
                            opacity: isStatusDisabled(row) ? 0.6 : 1,
                            cursor: isStatusDisabled(row) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleStatusChange(row.id, 'absent')}
                          disabled={isStatusDisabled(row)}
                          className="btn-sm"
                          style={{
                            ...styles.statusBtn,
                            backgroundColor: row.status === 'absent' ? 'var(--color-danger)' : '#fff',
                            color: row.status === 'absent' ? '#fff' : '#475569',
                            borderColor: row.status === 'absent' ? 'var(--color-danger)' : 'var(--color-border)',
                            opacity: isStatusDisabled(row) ? 0.6 : 1,
                            cursor: isStatusDisabled(row) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleStatusChange(row.id, 'late')}
                          disabled={isStatusDisabled(row)}
                          className="btn-sm"
                          style={{
                            ...styles.statusBtn,
                            backgroundColor: row.status === 'late' ? 'var(--color-warning)' : '#fff',
                            color: row.status === 'late' ? '#fff' : '#475569',
                            borderColor: row.status === 'late' ? 'var(--color-warning)' : 'var(--color-border)',
                            opacity: isStatusDisabled(row) ? 0.6 : 1,
                            cursor: isStatusDisabled(row) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Late
                        </button>
                      </div>

                      {isEditable && row.attendanceId && (
                        <button
                          onClick={() => handleDeleteSheetRecord(row.attendanceId, row.id)}
                          style={styles.deleteBtn}
                          className="btn-icon-only"
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
                  >
                    <UserCheck size={18} /> {saving ? 'Writing Database...' : 'Save & Publish Ledger'}
                  </button>
                </div>
              )}
            </div>
          )}
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
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--spacing-md)',
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
  configBarExpanded: {
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '1.25rem',
    marginBottom: '1.5rem',
    backgroundColor: '#fff',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    width: '100%'
  },
  configInputExpanded: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.65rem 1rem',
    fontSize: '0.9rem',
    outline: 'none',
    backgroundColor: '#fff',
    width: '100%'
  },
  // Styles moved to .attendance-stats-banner in index.css
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
    gap: 'var(--spacing-sm)'
  },
  bulkBtnGreen: {
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
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid #f1f5f9',
    gap: 'var(--spacing-md)',
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
    gap: 'var(--spacing-xs)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  statusBtn: {
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
    paddingTop: 'var(--spacing-md)',
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
