import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { Search, UserPlus, Edit3, Trash2, X, Phone, Users as UsersIcon, ChevronDown } from 'lucide-react';
import EmptyState from './EmptyState';
import InfoCard from './InfoCard';


export default function UsersModule({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal & Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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
    cnic: ''
  };

  const [formData, setFormData] = useState(blankForm);

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
    setFormData(blankForm);
    setEditingUser(null);
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
      cnic: user.cnic || ''
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

    if (editingUser) {
      const res = await database.users.update(editingUser.id, formData);
      if (res.success) {
        setIsFormOpen(false);
        loadUsers();
      } else {
        alert("Update failed: " + res.error);
      }
    } else {
      const res = await database.users.create(formData);
      if (res.success) {
        setIsFormOpen(false);
        loadUsers();
      } else {
        alert("Creation failed: " + res.error);
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.full_name} ${u.phone}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isEditable = userRole === 'admin';

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
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filtersGroup}>
          <div className="select-wrapper" style={{ width: 'auto' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="data_entry">Data entry</option>
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          {isEditable && (
            <button onClick={handleOpenCreateForm} className="btn-primary">
              <UserPlus size={16} /> Add User
            </button>
          )}
        </div>
      </div>

      {/* USERS LIST GRID */}
      {error && (
        <div style={styles.errorBanner}>
          ⚠️ Supabase error: {error}
        </div>
      )}
      {loading ? (
        <div style={styles.innerLoader}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: 10 }}>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={users.length === 0 ? UsersIcon : Search}
          title={users.length === 0 ? "No registered users" : "No matching users found"}
          message={users.length === 0 ? "Create a new user account to get started." : "Try clearing filters or adjusting your search query."}
        />
      ) : (
        <div className="info-card-grid">
          {filteredUsers.map((user) => (
            <InfoCard
              key={user.id}
              avatarInitial={(user.full_name || '?').charAt(0)}
              name={user.full_name}
              badgeLabel={user.role}
              badgeType={user.role}
              infoRows={[
                { icon: Phone, label: 'Phone', value: user.phone || '-' }
              ]}
              actions={
                isEditable
                  ? [
                      {
                        label: 'Edit Details',
                        icon: Edit3,
                        onClick: () => handleOpenEditForm(user),
                        variant: 'secondary'
                      },
                      {
                        label: 'Remove',
                        icon: Trash2,
                        onClick: () => handleDelete(user.id),
                        variant: 'danger'
                      }
                    ]
                  : []
              }
            />
          ))}
        </div>
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

            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Full Name *</label>
                  <input
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
                  <input
                    type="text"
                    placeholder="e.g. 03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, "") })}
                    className="form-input"
                    maxLength={11}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email Address</label>
                  <input
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
                  <label className="form-label">CNIC Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 35201-1234567-1"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    placeholder="Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Education Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. Matric, Intermediate, BS"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Father's Name</label>
                  <input
                    type="text"
                    placeholder="Father's Name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Mother's Name</label>
                  <input
                    type="text"
                    placeholder="Mother's Name"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Residential Address</label>
                  <input
                    type="text"
                    placeholder="Street address, City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-accent">
                  {editingUser ? 'Update Profile' : 'Create User'}
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
  }
};
