import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { BookOpen, PlusCircle, Edit3, Trash2, X, GraduationCap, ChevronDown } from 'lucide-react';

export default function CoursesModule({ userRole }) {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    teacher_id: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, teachersData] = await Promise.all([
        database.courses.list(),
        database.teachers.list()
      ]);
      setCourses(coursesData);
      setTeachers(teachersData);
    } catch (e) {
      console.error("Error loading courses modules:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  const handleOpenCreateForm = () => {
    setFormData({
      title: '',
      description: '',
      teacher_id: teachers.length > 0 ? teachers[0].id : ''
    });
    setEditingCourse(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (course) => {
    setFormData({
      title: course.title,
      description: course.description || '',
      teacher_id: course.teacher_id || ''
    });
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course? This will remove it from the system curriculum list.")) {
      const res = await database.courses.delete(id);
      if (res.success) {
        loadData();
      } else {
        alert("Delete failed: " + res.error);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (editingCourse) {
      const res = await database.courses.update(editingCourse.id, formData);
      if (res.success) {
        setIsFormOpen(false);
        loadData();
      } else {
        alert("Failed to update course: " + res.error);
      }
    } else {
      const res = await database.courses.create(formData);
      if (res.success) {
        setIsFormOpen(false);
        loadData();
      } else {
        alert("Failed to create course: " + res.error);
      }
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const isEditable = userRole === 'admin';

  return (
    <>
      {!isFormOpen && (
        <div className="fade-in">
      <h1 className="section-title">Courses Registry</h1>

      {/* FILTER & ACTIONS BAR */}
      <div style={styles.filterBar} className="glass-panel">
        <div style={styles.searchBox}>
          <BookOpen size={16} color="#64748b" />
          <input autoComplete="off"
            type="text"
            placeholder="Search by course title or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {isEditable && (
          <button onClick={handleOpenCreateForm} className="btn-primary">
            <PlusCircle size={16} /> Add Course
          </button>
        )}
      </div>

      {/* COURSES CARD GRID */}
      {loading ? (
        <div style={styles.innerLoader}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: 10 }}>Loading courses curriculum...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div style={styles.noData}>No courses registered in curriculum registry.</div>
      ) : (
        <div style={styles.courseGrid}>
          {filteredCourses.map((course) => (
            <div key={course.id} className="glass-panel" style={styles.courseCard}>
              <div style={styles.cardHeader}>
                <BookOpen size={22} color="var(--color-accent)" />
                <h3 style={styles.courseTitle}>{course.title}</h3>
              </div>

              <p style={styles.courseDesc}>{course.description || 'No description provided for this course.'}</p>
              
              <div style={styles.instructorBox}>
                <GraduationCap size={16} color="var(--color-primary-light)" />
                <span style={styles.instructorLabel}>Instructor:</span>
                <strong style={styles.instructorVal}>{course.teacher_name}</strong>
              </div>

              {isEditable && (
                <div style={styles.cardActions}>
                  <button onClick={() => handleOpenEditForm(course)} className="btn-secondary" style={styles.editBtn}>
                    <Edit3 size={14} /> Edit Course
                  </button>
                  <button onClick={() => handleDelete(course.id)} style={styles.deleteBtn}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
      )}

      {/* ADD / EDIT COURSE MODAL */}
      {isFormOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingCourse ? 'Edit Course Details' : 'Create New Course'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form autoComplete="off" onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Course Title *</label>
                <input autoComplete="off"
                  type="text"
                  required
                  placeholder="e.g. Classical Arabic Grammar"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Description</label>
                <textarea
                  rows="3"
                  placeholder="Summarize course goals, curriculum scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Instructor *</label>
                <div className="select-wrapper">
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.subject})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  {editingCourse ? 'Save Course' : 'Create Course'}
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
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  courseCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '220px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem'
  },
  courseTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  courseDesc: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '1rem'
  },
  instructorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    marginTop: 'auto',
    border: '1px solid #f1f5f9'
  },
  instructorLabel: {
    color: '#64748b'
  },
  instructorVal: {
    color: 'var(--color-primary)'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem',
    marginTop: '0.75rem'
  },
  editBtn: {
    flex: 1,
    fontSize: '0.8rem',
    justifyContent: 'center'
  },
  deleteBtn: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '500',
    transition: 'all 0.15s'
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
