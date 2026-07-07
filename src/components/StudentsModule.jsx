import { useState, useEffect } from 'react';
import { database, supabase } from '../supabaseClient';
import { Search, UserPlus, Edit3, Trash2, X, Eye, Phone, MapPin, Calendar, CheckSquare } from 'lucide-react';

export default function StudentsModule({ userRole, user }) {

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

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  
  // Modals & Active student state
  const [activeStudent, setActiveStudent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Fee & Attendance state for selected student profile
  const [studentFees, setStudentFees] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);

  // Form Field States
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    class_name: 'Grade 1',
    roll_number: '',
    father_name: '',
    address: ''
  });

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await database.students.list();
      setStudents(data);
    } catch (e) {
      console.error("Error loading students:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadStudents();
    })();
  }, []);

  // When student profile is clicked, load their auxiliary files
  const handleViewDetails = async (student) => {
    setActiveStudent(student);
    try {
      const allFees = await database.fees.list();
      const studentFeesData = allFees.filter(f => f.student_id === student.id);
      setStudentFees(studentFeesData);

      // Fetch student attendance logs
      const att = await database.attendance.listForUser(student.user_id);
      setStudentAttendance(att);
    } catch (e) {
      console.error("Error loading auxiliary details:", e);
    }
  };

  const handleOpenCreateForm = () => {
    const nextRoll = `DUH-2026-${String(students.length + 1).padStart(3, '0')}`;
    setFormData({
      full_name: '',
      phone: '',
      class_name: 'Grade 1',
      roll_number: nextRoll,
      father_name: '',
      address: ''
    });
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (student) => {
    setFormData({
      full_name: student.full_name,
      phone: student.phone || '',
      class_name: student.class,
      roll_number: student.roll_number,
      father_name: student.father_name,
      address: student.address || ''
    });
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student profile? This will clear all fee and attendance logs associated with them.")) {
      const res = await database.students.delete(id);
      if (res.success) {
        if (activeStudent?.id === id) setActiveStudent(null);
        loadStudents();
      } else {
        alert("Delete failed: " + res.error);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (editingStudent) {
      // Update
      const res = await database.students.update(editingStudent.id, {
        ...formData,
        user_id: editingStudent.user_id
      });
      if (res.success) {
        setIsFormOpen(false);
        loadStudents();
        if (activeStudent?.id === editingStudent.id) {
          setActiveStudent({ ...activeStudent, ...formData, class: formData.class_name });
        }
      } else {
        alert("Update failed: " + res.error);
      }
    } else {
      // Create
      const res = await database.students.create(formData);
      if (res.success) {
        setIsFormOpen(false);
        loadStudents();
      } else {
        alert("Creation failed: " + res.error);
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = `${s.full_name} ${s.roll_number} ${s.father_name}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesClass = classFilter === '' || s.class === classFilter;
    return matchesSearch && matchesClass;
  });

  const isEditable = true; // Allow editing for all logged-in users
  const normRole = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';

  const canEditStudent = (student) => {
    if (normRole === 'admin') return true;
    if (normRole === 'student') return true;
    if (normRole === 'data_entry') return true;
    if (normRole === 'teacher') {
      return teacherSubject && (
        student.class.toLowerCase().includes(teacherSubject.toLowerCase()) || 
        teacherSubject.toLowerCase().includes(student.class.toLowerCase())
      );
    }
    return false;
  };

  const canDeleteStudent = () => {
    if (normRole === 'admin') return true;
    if (normRole === 'student') return true;
    return false;
  };

  return (
    <>
      {!isFormOpen && (
        <div className="fade-in" style={styles.container}>
      <h1 className="section-title">Students Roster</h1>
      
      {/* FILTER ACTION BAR */}
      <div style={styles.filterBar} className={`glass-panel filter-bar ${!loading && filteredStudents.length === 0 ? 'configBarExpanded' : ''}`}>
        <div style={styles.searchBox} className="filter-bar__search">
          <input
            type="text"
            placeholder="Search by student name, roll number, father..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.filtersGroup} className="filter-bar__controls">
          <select 
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)} 
            style={styles.filterSelect}
          >
            <option value="">All Classes</option>
            <option value="Grade 1">Grade 1</option>
            <option value="Grade 2">Grade 2</option>
            <option value="Grade 3">Grade 3</option>
            <option value="Grade 4">Grade 4</option>
            <option value="Grade 5">Grade 5</option>
            <option value="Hifz">Hifz</option>
            <option value="Nazra">Nazra</option>
          </select>

          {isEditable && (
            <button onClick={handleOpenCreateForm} className="btn-primary">
              <UserPlus size={16} /> Admit Student
            </button>
          )}
        </div>
      </div>

      {/* DUAL WORKSPACE SPLIT */}
      {(!loading && filteredStudents.length === 0) ? null : (
      <div style={styles.workspace}>
        {/* ROSTER TABLE */}
        <div style={{ ...styles.tableArea, width: activeStudent ? '60%' : '100%' }}>
          {loading ? (
            <div style={styles.innerLoader}>
              <div className="spinner" style={styles.spinner}></div>
              <p style={{ marginTop: 10 }}>Loading rosters...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Full Name</th>
                    <th>Class</th>
                    <th>Father's Name</th>
                    <th>Contact</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} style={{ 
                      backgroundColor: activeStudent?.id === student.id ? '#fdf8ec' : 'transparent',
                      borderLeft: activeStudent?.id === student.id ? '3px solid var(--color-accent)' : 'none'
                    }}>
                      <td style={{ fontWeight: '700', color: 'var(--color-primary-light)' }}>{student.roll_number}</td>
                      <td style={{ fontWeight: '600' }}>{student.full_name}</td>
                      <td>{student.class}</td>
                      <td>{student.father_name}</td>
                      <td>{student.phone || '-'}</td>
                      <td style={styles.actionsCell}>
                        <button onClick={() => handleViewDetails(student)} style={styles.actionBtn} className="btn-icon-only" title="View Profile">
                          <Eye size={15} color="var(--color-primary)" />
                        </button>
                        <>
                          {canEditStudent(student) && (
                            <button onClick={() => handleOpenEditForm(student)} style={styles.actionBtn} className="btn-icon-only" title="Edit Student">
                              <Edit3 size={15} color="var(--color-accent)" />
                            </button>
                          )}
                          {canDeleteStudent() && (
                            <button onClick={() => handleDelete(student.id)} style={styles.actionBtn} className="btn-icon-only" title="Delete">
                              <Trash2 size={15} color="var(--color-danger)" />
                            </button>
                          )}
                        </>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAILED STUDENT WORKSPACE PROFILE */}
        {activeStudent && (
          <div className="glass-panel fade-in" style={styles.profileArea}>
            <div style={styles.profileHeader}>
              <h3 style={styles.profileTitle}>Student Profile Details</h3>
              <button onClick={() => setActiveStudent(null)} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <div style={styles.profileCard}>
              <div style={styles.profileAvatar}>
                {activeStudent.full_name.charAt(0)}
              </div>
              <h4 style={styles.profileName}>{activeStudent.full_name}</h4>
              <span className="badge success">Active Student</span>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Roll Number</span>
                <span style={styles.detailVal}>{activeStudent.roll_number}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Class Assigned</span>
                <span style={styles.detailVal}>{activeStudent.class}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Father's Name</span>
                <span style={styles.detailVal}>{activeStudent.father_name}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Phone Contact</span>
                <span style={styles.detailVal}>{activeStudent.phone || 'Not Specified'}</span>
              </div>
            </div>

            <hr style={styles.divider} />

            <div style={styles.parentBox}>
              <div style={styles.parentRow}>
                <span style={styles.parentLabel}>Address:</span>
                <span style={styles.parentVal}>{activeStudent.address || 'Not Specified'}</span>
              </div>
            </div>

            <hr style={styles.divider} />

            {/* AUXILIARY HISTORIES */}
            <h4 style={styles.subHeading}>Billing Invoices</h4>
            <div style={styles.auxList}>
              {studentFees.length === 0 ? (
                <p style={styles.auxEmpty}>No fee invoices logged.</p>
              ) : (
                studentFees.map(f => (
                  <div key={f.id} style={styles.auxItem}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Due Date: {f.due_date}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-primary)' }}>PKR {Number(f.amount).toLocaleString()}</span>
                      <div>
                        <span className={`badge ${f.status === 'paid' ? 'success' : 'danger'}`} style={{ fontSize: '0.6rem', padding: '0 0.2rem' }}>
                          {f.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <h4 style={styles.subHeading}>Recent Attendance Log</h4>
            <div style={styles.auxList}>
              {studentAttendance.length === 0 ? (
                <p style={styles.auxEmpty}>No attendance logged yet.</p>
              ) : (
                studentAttendance.slice(0, 5).map(a => (
                  <div key={a.id} style={styles.auxItem}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{a.date}</span>
                    <span className={`badge ${a.status === 'present' ? 'success' : (a.status === 'absent' ? 'danger' : 'warning')}`} style={{ fontSize: '0.6rem' }}>
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      )}
      </div>
      )}

      {/* ADMIT / EDIT STUDENT FORM */}
      {isFormOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card" aria-live="assertive">
            <div style={styles.modalHeader}>
              <h3 id="modal-title" style={styles.modalTitle}>{editingStudent ? 'Edit Student Profile' : 'Admit New Student'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={styles.closeBtn} className="btn-icon-only" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Student Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="DUH-2026-001"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone Contact Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Class Level *</label>
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="form-input"
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
              </div>

              <div className="form-group">
                <label className="form-label">Father's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Father's Full Name"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <textarea
                  rows="2"
                  placeholder="Full Residential Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  {editingStudent ? 'Save Profile' : 'Admit Student'}
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
  container: {
    padding: '0 0.5rem'
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
  workspace: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  tableArea: {
    flex: 1,
    minWidth: '320px',
    transition: 'all 0.3s ease'
  },
  actionsCell: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  actionBtn: {
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: '#fff',
    transition: 'all 0.15s'
  },
  profileArea: {
    width: '38%',
    minWidth: '300px',
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)'
  },
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem'
  },
  profileTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
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
  profileCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  profileAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-light)',
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--color-accent-gold)',
    marginBottom: '0.5rem',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  },
  profileName: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '0.2rem'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    backgroundColor: 'var(--color-bg-base)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid #f1f5f9'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },
  detailVal: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--color-text-main)'
  },
  divider: {
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    margin: '1.25rem 0'
  },
  subHeading: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center'
  },
  parentBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.85rem'
  },
  parentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px dashed #f1f5f9',
    paddingBottom: '0.2rem'
  },
  parentLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  parentVal: {
    fontWeight: '600'
  },
  auxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    maxHeight: '130px',
    overflowY: 'auto',
    marginBottom: '1rem',
    paddingRight: '4px'
  },
  auxItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-bg-base)',
    border: '1px solid #f1f5f9'
  },
  auxEmpty: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '0.5rem 0'
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
    maxWidth: '560px',
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
  }
};
