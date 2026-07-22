import { useState, useEffect } from 'react';
import { database, supabase, uploadPhoto } from '../supabaseClient';
import { Search, UserPlus, Edit3, Trash2, X, Phone, Award, DollarSign, ChevronDown, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import Badge from './Badge';
import Select from './ui/Select';

export default function TeachersModule({ userRole }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Modal & Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Photo Upload State
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
      alert('Image size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    subject: 'Hifz Instruction',
    qualification: '',
    salary: '',
    joining_date: new Date().toISOString().split('T')[0],
    photo_url: ''
  });

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const data = await database.teachers.list();
      setTeachers(data);
    } catch (e) {
      console.error("Error loading teachers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadTeachers();
    })();
  }, []);

  const handleOpenCreateForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      password: '',
      subject: 'Hifz Instruction',
      qualification: '',
      salary: '',
      joining_date: new Date().toISOString().split('T')[0],
      photo_url: ''
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditingTeacher(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (teacher) => {
    setFormData({
      full_name: teacher.full_name,
      phone: teacher.phone || '',
      email: '',
      password: '',
      subject: teacher.subject,
      qualification: teacher.qualification || '',
      salary: teacher.salary,
      joining_date: teacher.joining_date,
      photo_url: teacher.photo_url || ''
    });
    setPhotoFile(null);
    setPhotoPreview(teacher.photo_url || null);
    setEditingTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this teacher registry? This will clear all payroll records associated with them.")) {
      const res = await database.teachers.delete(id);
      if (res.success) {
        loadTeachers();
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

      const cleanData = {
        ...formData,
        salary: Number(formData.salary),
        photo_url: finalPhotoUrl
      };

      if (editingTeacher) {
        const res = await database.teachers.update(editingTeacher.id, {
          ...cleanData,
          user_id: editingTeacher.user_id
        });
        if (res.success) {
          setIsFormOpen(false);
          loadTeachers();
        } else {
          alert("Update failed: " + res.error);
        }
        return;
      }

      const { email, password, ...teacherPayload } = cleanData;

      if (!email || !password) {
        alert('Email and password are required to create a teacher account.');
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'teacher' }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const authUserId = authData?.user?.id;
      const res = await database.teachers.create({
        ...teacherPayload,
        ...(authUserId ? { user_id: authUserId } : {})
      });

      if (res.success) {
        setIsFormOpen(false);
        loadTeachers();
      } else {
        alert("Creation failed: " + res.error);
      }
    } catch (err) {
      alert("Creation failed: " + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = `${t.full_name} ${t.subject} ${t.qualification}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesSubject = subjectFilter === '' || t.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
  const isEditable = norm === 'admin';
  const canAdd = norm === 'admin' || norm === 'data_entry';

  return (
    <>
      {!isFormOpen && (
        <div className="fade-in" style={styles.container}>
      <h1 className="section-title">Instructors Registry</h1>

      {/* FILTER ACTION BAR */}
      <div style={styles.filterBar} className={`glass-panel filter-bar ${!loading && filteredTeachers.length === 0 ? 'configBarExpanded' : ''}`}>
        <div style={styles.searchBox} className="filter-bar__search">
          <Search size={18} color="var(--color-text-muted)" />
          <input autoComplete="off"
            type="text"
            placeholder="Search by instructor name, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup} className="filter-bar__controls">
            <Select
              items={[
                { value: '', label: 'All Subjects' },
                { value: 'Hifz Instruction', label: 'Hifz Instruction' },
                { value: 'Tajweed & Qiraat', label: 'Tajweed & Qiraat' },
                { value: 'Islamic Studies', label: 'Islamic Studies' },
                { value: 'Arabic Language', label: 'Arabic Language' },
                { value: 'Primary Sciences', label: 'Primary Sciences' }
              ]}
              value={subjectFilter}
              onChange={setSubjectFilter}
              placeholder="Select subject"
            />

          {canAdd && (
            <button onClick={handleOpenCreateForm} className="btn-primary">
              <UserPlus size={16} /> Appoint Instructor
            </button>
          )}
        </div>
      </div>

      {/* TEACHERS DATA TABLE */}
      {loading ? (
        <LoadingSpinner message="Loading instructor registry..." />
      ) : filteredTeachers.length === 0 ? (
        <EmptyState
          icon={teachers.length === 0 ? Award : Search}
          title={teachers.length === 0 ? "No instructors registered" : "No matching instructors found"}
          message={teachers.length === 0 ? "Appoint a new teacher to build the registry." : "Try clearing filters or adjusting your search query."}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'full_name',
              header: 'Instructor Name',
              type: 'avatar',
              sortable: true
            },
            {
              key: 'subject',
              header: 'Subject / Role',
              sortable: true,
              render: (teacher) => (
                <div>
                  <Badge label={teacher.subject} type="teacher" />
                  {teacher.qualification && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>
                      {teacher.qualification}
                    </span>
                  )}
                </div>
              )
            },
            {
              key: 'phone',
              header: 'Contact Phone',
              sortable: true,
              render: (teacher) => (
                <div>
                  <div>{teacher.phone || '-'}</div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Joined: {teacher.joining_date}</span>
                </div>
              )
            }
          ]}
          data={filteredTeachers}
          emptyIcon={Award}
          emptyTitle="No instructors found"
          emptyMessage="No matching instructors found."
          renderActions={(teacher) => (
            <>
              {(isEditable || norm === 'data_entry') && (
                <button
                  onClick={() => handleOpenEditForm(teacher)}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  title="Edit Details"
                >
                  <Edit3 size={14} /> Edit
                </button>
              )}
              {isEditable && (
                <button
                  onClick={() => handleDelete(teacher.id)}
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
      )}
      </div>
      )}

      {/* APPOINT / EDIT TEACHER MODAL */}
      {isFormOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingTeacher ? 'Update Instructor Profile' : 'Appoint New Instructor'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={styles.closeBtn} className="btn-icon-only">
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
                    formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'T'
                  )}
                </div>
                <div className="photo-upload-input-group">
                  <label className="photo-upload-label">Instructor Profile Photo</label>
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
                    placeholder="Instructor Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Subject Taught *</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="form-input"
                    >
                      <option value="Hifz Instruction">Hifz Instruction</option>
                      <option value="Arabic Language">Arabic Language</option>
                      <option value="Islamic Studies">Islamic Studies</option>
                      <option value="Mathematics & Science">Mathematics & Science</option>
                      <option value="English Language">English Language</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>

              {!editingTeacher && (
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Email Address *</label>
                    <input autoComplete="off"
                      type="email"
                      required
                      placeholder="teacher@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Password *</label>
                    <input autoComplete="off"
                      type="password"
                      required
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone Contact *</label>
                  <input autoComplete="off"
                    type="text"
                    required
                    placeholder="e.g. 03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, "") })}
                    className="form-input"
                    maxLength={11}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Joining Date *</label>
                  <input autoComplete="off"
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Qualification Credentials</label>
                  <input autoComplete="off"
                    type="text"
                    placeholder="e.g., Hafiz-e-Quran, MA Arabic"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Monthly Salary (PKR) *</label>
                  <input autoComplete="off"
                    type="number"
                    required
                    placeholder="Salary scale"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="form-input"
                  />
                </div>
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
                    editingTeacher ? 'Update Profile' : 'Confirm Appointment'
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
  teacherGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  teacherCard: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '250px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '0.75rem',
    marginBottom: '0.75rem',
    position: 'relative'
  },
  teacherAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--color-accent-gold)'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  teacherName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  teacherId: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.82rem',
    borderBottom: '1px dashed #f8fafc',
    paddingBottom: '0.2rem'
  },
  infoLabel: {
    color: '#64748b',
    fontWeight: '500',
    width: '90px',
    flexShrink: 0
  },
  infoVal: {
    fontWeight: '600',
    color: 'var(--color-text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem',
    marginTop: 'auto'
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
  }
};
