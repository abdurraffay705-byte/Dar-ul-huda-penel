import { useState, useEffect } from 'react';
import { database, supabase } from '../supabaseClient';
import { Search, UserPlus, Edit3, Trash2, X, Phone, Users as UsersIcon, ChevronDown, Loader2, Mail, Fingerprint, Calendar, GraduationCap, User, MapPin, Eye, EyeOff } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import Select from './ui/Select';
import LoadingSpinner from './LoadingSpinner';


export default function UsersModule({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal & Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const blankForm = {
    full_name: '',
    phone: '',
    role: 'student',
    email: '',
    education: '',
    age: '',
    father_name: '',
    mother_name: '',
    address: '',
    cnic: '',
    password: ''
  };

  const [formData, setFormData] = useState(blankForm);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await database.users.list();
      setUsers(data);
    } catch (e) {
      console.error('Error loading users:', e);
      setError(e.message || 'Failed to load users from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
    })();
  }, []);

  const handleOpenCreateForm = () => {
    setFormData({ ...blankForm, password: '' });
    setEditingUser(null);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (user) => {
    setFormData({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'student',
      email: user.email || '',
      education: user.education || '',
      age: user.age || '',
      father_name: user.father_name || '',
      mother_name: user.mother_name || '',
      address: user.address || '',
      cnic: user.cnic || '',
      password: ''
    });
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this user? This cannot be undone.")) {
      const res = await database.users.delete(id);
      if (res.success) {
        loadUsers();
      } else {
        alert("Delete failed: " + res.error);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingUser) {
        const { password, ...profileData } = formData;
        const emailChanged = formData.email !== editingUser.email;
        const res = await database.users.update(editingUser.id, profileData);
        if (res.success) {
          if (emailChanged) {
            const { data, error } = await supabase.functions.invoke('update-user-email', {
              body: { uid: editingUser.id, newEmail: formData.email }
            });
            if (error) {
              alert("Profile updated, but email sync to Auth failed: " + error.message);
            } else if (data && data.error) {
              alert("Profile updated, but email sync to Auth failed: " + data.error);
            }
          }
          if (password && password.trim().length > 0) {
            const { data, error } = await supabase.functions.invoke('update-user-password', {
              body: { uid: editingUser.id, password }
            });
            if (error) {
              alert("Profile updated, but password update failed: " + error.message);
            } else if (data && data.error) {
              alert("Profile updated, but password update failed: " + data.error);
            }
          }
          setIsFormOpen(false);
          loadUsers();
        } else {
          alert("Update failed: " + res.error);
        }
      } else {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: formData
        });

        if (error) {
          alert("Creation failed: " + error.message);
        } else if (data && data.error) {
          alert("Creation failed: " + data.error);
        } else {
          setCreatedCredentials({
            email: formData.email,
            password: formData.password
          });
          setIsFormOpen(false);
          loadUsers();
        }
      }
    } catch (err) {
      alert("Error submitting user form: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.full_name} ${u.phone}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isEditable = userRole === 'admin' || userRole === 'data_entry';

  const roleBadgeStyle = (role) => {
    const map = {
      admin: { backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#92702c' },
      teacher: { backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
      student: { backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
      data_entry: { backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed' }
    };
    return { ...styles.roleBadge, ...(map[role] || {}) };
  };

  return (
    <>
      {!isFormOpen && (
        <div className="fade-in">
      <h1 className="section-title">Users Management</h1>

      {/* FILTER & ACTIONS BAR */}
      <div style={styles.filterBar} className="glass-panel">
        <div style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <input autoComplete="off"
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup}>
            <Select
              items={[
                { value: '', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'student', label: 'Student' },
                { value: 'data_entry', label: 'Data entry' }
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="Select role"
            />

          {isEditable && (
            <button onClick={handleOpenCreateForm} className="btn-primary">
              <UserPlus size={16} /> Add User
            </button>
          )}
        </div>
      </div>

      {/* USERS DATA TABLE */}
      {error && (
        <div style={styles.errorBanner}>
          ⚠️ Supabase error: {error}
        </div>
      )}
      {loading ? (
        <LoadingSpinner message="Loading system users..." />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={users.length === 0 ? UsersIcon : Search}
          title={users.length === 0 ? "No registered users" : "No matching users found"}
          message={users.length === 0 ? "Create a new user account to get started." : "Try clearing filters or adjusting your search query."}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'full_name',
              header: 'User Name',
              type: 'avatar',
              subtextKey: 'email',
              sortable: true
            },
            {
              key: 'role',
              header: 'System Role',
              type: 'badge',
              sortable: true
            },
            {
              key: 'phone',
              header: 'Contact Info',
              sortable: true,
              render: (u) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{u.phone || '-'}</div>
                  {u.cnic && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>CNIC: {u.cnic}</span>
                  )}
                </div>
              )
            }
          ]}
          data={filteredUsers}
          emptyIcon={UsersIcon}
          emptyTitle="No users found"
          emptyMessage="No matching users found."
          renderActions={(u) => (
            <>
              {isEditable && (
                <>
                  <button
                    onClick={() => handleOpenEditForm(u)}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    title="Edit Details"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="btn-danger"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    title="Remove"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </>
              )}
            </>
          )}
        />
      )}
      </div>
      )}

      {/* ADD / EDIT USER MODAL */}
      {isFormOpen && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingUser ? 'Update User Profile' : 'Add New User'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={styles.closeBtn} className="btn-icon-only">
                <X size={18} />
              </button>
            </div>

            <form autoComplete="off" onSubmit={handleFormSubmit} style={styles.modalForm}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-primary)' }}>Personal Information</h4>
              
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Full Name *</label>
                  <input autoComplete="off"
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Role *</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="form-input"
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                      <option value="data_entry">Data entry</option>
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone</label>
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
                  <label className="form-label">CNIC Number</label>
                  <input autoComplete="off"
                    type="text"
                    placeholder="e.g. 35201-1234567-1"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Age</label>
                  <input autoComplete="off"
                    type="number"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Education Qualification</label>
                  <input autoComplete="off"
                    type="text"
                    placeholder="e.g. Matric, Intermediate, BS"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Father's Name</label>
                  <input autoComplete="off"
                    type="text"
                    placeholder="Father's Name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Mother's Name</label>
                  <input autoComplete="off"
                    type="text"
                    placeholder="Mother's Name"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Residential Address</label>
                  <input autoComplete="new-password"
                    type="text"
                    placeholder="Street address, City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <h4 style={{ margin: '1.5rem 0 1rem 0', color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>Login Credentials</h4>
              
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email Address</label>
                  <input autoComplete="off"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">{editingUser ? 'New Password' : 'Password *'}</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input autoComplete="new-password"
                      type={showPassword ? "text" : "password"}
                      required={!editingUser}
                      minLength={6}
                      placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                      style={{ minWidth: '150px', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="btn-secondary"
                      style={{ padding: '0 0.5rem', height: '38px', flexShrink: 0 }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="btn-secondary"
                      style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      Generate
                    </button>
                  </div>
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
                    editingUser ? 'Update Profile' : 'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdCredentials && (
        <div className="standalone-form-container fade-in">
          <div className="glass-panel fade-in modal-card">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>User Created Successfully</h3>
              <button 
                onClick={() => setCreatedCredentials(null)} 
                style={styles.closeBtn}
                className="btn-icon-only"
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '0.5rem 0 1rem 0' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Please copy and share these credentials with the user immediately. The password is not stored in plaintext and cannot be recovered later.
              </p>
              
              <div style={styles.credentialBox}>
                <div style={styles.credentialRow}>
                  <strong>Email:</strong> <code style={{ marginLeft: 8, fontSize: '0.95rem', backgroundColor: '#fff', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4, color: 'var(--color-text-main)' }}>{createdCredentials.email}</code>
                </div>
                <div style={styles.credentialRow} style={{ marginTop: '0.75rem' }}>
                  <strong>Password:</strong> <code style={{ marginLeft: 8, fontSize: '0.95rem', backgroundColor: '#fff', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 4, color: 'var(--color-text-main)' }}>{createdCredentials.password}</code>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setCreatedCredentials(null)} 
                className="btn-secondary"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                  alert("Credentials copied to clipboard!");
                }} 
                className="btn-accent"
              >
                Copy Credentials
              </button>
            </div>
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
  userGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  userCard: {
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
  userAvatar: {
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
    flexDirection: 'column',
    gap: '0.2rem'
  },
  userName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  roleBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    padding: '0.1rem 0.5rem',
    borderRadius: '9999px',
    textTransform: 'capitalize',
    display: 'inline-block',
    alignSelf: 'flex-start'
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
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
  },
  credentialBox: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  credentialRow: {
    fontSize: '0.95rem',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center'
  }
};
