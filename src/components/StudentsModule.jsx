import { useState, useEffect } from 'react';
import { database, supabase, uploadPhoto } from '../supabaseClient';
import { Search, UserPlus, Edit3, Trash2, X, Eye, Phone, ChevronDown, GraduationCap, User, Loader2, BookOpen, Upload } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import Badge from './Badge';
import Select from './ui/Select';



export default function StudentsModule({ userRole, user }) {

  const [teacherSubject, setTeacherSubject] = useState('');

  useEffect(() => {
    async function fetchTeacherSubject() {
      const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
      if (norm === 'teacher' && user?.id) {
        try {
          const { data } = await supabase
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
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    address: '',
    section_id: ''
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

  const loadSections = async () => {
    try {
      const data = await database.sections.list();
      setSections(data);
    } catch (e) {
      console.error("Error loading sections in StudentsModule:", e);
    }
  };

  useEffect(() => {
    (async () => {
      await loadStudents();
      await loadSections();
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

  // Photo Upload States
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB. Please choose a smaller image.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleOpenCreateForm = () => {
    const nextRoll = `DUH-2026-${String(students.length + 1).padStart(3, '0')}`;
    setFormData({
      full_name: '',
      phone: '',
      class_name: 'Grade 1',
      roll_number: nextRoll,
      father_name: '',
      address: '',
      section_id: '',
      photo_url: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
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
      address: student.address || '',
      section_id: student.section_id || '',
      photo_url: student.photo_url || ''
    });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || null);
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
    try {
      setIsSubmitting(true);
      let finalPhotoUrl = formData.photo_url;
      if (photoFile) {
        finalPhotoUrl = await uploadPhoto(photoFile);
      }

      const payload = {
        ...formData,
        photo_url: finalPhotoUrl
      };

      if (editingStudent) {
        // Update
        const res = await database.students.update(editingStudent.id, {
          ...payload,
          user_id: editingStudent.user_id
        });
        if (res.success) {
          setIsFormOpen(false);
          loadStudents();
          if (activeStudent?.id === editingStudent.id) {
            const matchedSec = sections.find(sec => sec.id === formData.section_id);
            setActiveStudent({
              ...activeStudent,
              ...payload,
              class: formData.class_name,
              section_name: matchedSec ? matchedSec.name : '',
              section_program: matchedSec ? matchedSec.program : ''
            });
          }
        } else {
          alert("Update failed: " + res.error);
        }
      } else {
        // Create
        const res = await database.students.create(payload);
        if (res.success) {
          setIsFormOpen(false);
          loadStudents();
        } else {
          alert("Creation failed: " + res.error);
        }
      }
    } catch (err) {
      alert("Error submitting student form: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
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
      <div className={`glass-panel filter-bar ${!loading && filteredStudents.length === 0 ? 'configBarExpanded' : ''}`}>
        <div className="filter-bar__search">
          <Search size={18} color="var(--color-text-muted)" />
          <input autoComplete="off"
            type="text"
            placeholder="Search by student name, roll number, father..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-shared"
          />
        </div>
        
        <div className="filter-bar__controls">
          <Select
            items={[
              { value: '', label: 'All Classes' },
              { value: 'Grade 1', label: 'Grade 1' },
              { value: 'Grade 2', label: 'Grade 2' },
              { value: 'Grade 3', label: 'Grade 3' },
              { value: 'Grade 4', label: 'Grade 4' },
              { value: 'Grade 5', label: 'Grade 5' },
              { value: 'Hifz', label: 'Hifz' },
              { value: 'Nazra', label: 'Nazra' }
            ]}
            value={classFilter}
            onChange={setClassFilter}
            placeholder="Select class"
          />

          {isEditable && (
            <button onClick={handleOpenCreateForm} className="btn-primary-action">
              <UserPlus size={16} /> Admit Student
            </button>
          )}
        </div>
      </div>

      {/* DUAL WORKSPACE SPLIT */}
      {loading ? (
        <LoadingSpinner message="Loading student rosters..." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={students.length === 0 ? GraduationCap : Search}
          title={students.length === 0 ? "No students registered" : "No matching students found"}
          message={students.length === 0 ? "Admit a new student to build the roster." : "Try clearing filters or adjusting your search query."}
        />
      ) : (
      <div style={styles.workspace}>
        {/* ROSTER DATA TABLE */}
        <div style={{ ...styles.tableArea, width: activeStudent ? '60%' : '100%' }}>
          <DataTable
            columns={[
              {
                key: 'full_name',
                header: 'Student Name',
                type: 'avatar',
                subtextKey: 'roll_number',
                sortable: true
              },
              {
                key: 'class',
                header: 'Class / Section',
                sortable: true,
                render: (student) => (
                  <div>
                    <Badge label={student.class} type="student" />
                    {student.section_name && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                        {student.section_name} ({student.section_program || ''})
                      </span>
                    )}
                  </div>
                )
              },
              {
                key: 'phone',
                header: 'Guardian Contact',
                sortable: true,
                render: (student) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{student.phone || '-'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Father: {student.father_name}</div>
                  </div>
                )
              }
            ]}
            data={filteredStudents}
            emptyIcon={GraduationCap}
            emptyTitle={students.length === 0 ? "No students registered" : "No matching students found"}
            emptyMessage={students.length === 0 ? "Admit a new student to build the roster." : "Try clearing filters or adjusting your search query."}
            renderActions={(student) => (
              <>
                <button
                  onClick={() => handleViewDetails(student)}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  title="View Details"
                >
                  <Eye size={14} /> Profile
                </button>
                {canEditStudent(student) && (
                  <button
                    onClick={() => handleOpenEditForm(student)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    title="Edit Details"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                {canDeleteStudent() && (
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="btn-danger"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    title="Delete"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </>
            )}
          />
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
              <Badge label="Active Student" type="success" />
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
                <span style={styles.detailLabel}>Assigned Section</span>
                <span style={styles.detailVal}>{activeStudent.section_name ? `${activeStudent.section_name} (${activeStudent.section_program || ''})` : 'Unassigned'}</span>
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
                        <Badge label={f.status} type={f.status} />
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
                    <Badge label={a.status} type={a.status} />
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
            
            <form autoComplete="off" onSubmit={handleFormSubmit} style={styles.modalForm}>
              {/* PHOTO UPLOAD & PREVIEW */}
              <div className="photo-upload-container">
                <div className="photo-preview-circle">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="photo-preview-img" />
                  ) : (
                    formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'S'
                  )}
                </div>
                <div className="photo-upload-input-group">
                  <label className="photo-upload-label">Student Profile Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ fontSize: '0.82rem' }}
                  />
                  <span className="photo-upload-hint">Accepted formats: JPG, PNG, WEBP (Max 2MB)</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Full Name *</label>
                  <input autoComplete="off"
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
                  <input autoComplete="off"
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
                  <input autoComplete="off"
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, "") })}
                    className="form-input"
                    maxLength={11}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Class Level *</label>
                  <div className="select-wrapper">
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
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Father's Name *</label>
                  <input autoComplete="off"
                    type="text"
                    required
                    placeholder="Father's Full Name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assigned Section</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.section_id}
                      onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Unassigned</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} ({sec.program})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
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
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-accent" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Saving...
                    </>
                  ) : (
                    editingStudent ? 'Save Profile' : 'Admit Student'
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
