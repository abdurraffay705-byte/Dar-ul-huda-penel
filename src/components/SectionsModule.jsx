import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { Search, PlusCircle, Edit3, Trash2, X, GraduationCap, User, Layers, Loader2, ChevronDown, Eye } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import Badge from './Badge';
import Drawer from './ui/Drawer';

export default function SectionsModule({ userRole }) {
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal & Form State
  const [activeSection, setActiveSection] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    program: '',
    teacher_id: ''
  });

  const loadSections = async () => {
    try {
      setLoading(true);
      const data = await database.sections.list();
      setSections(data);
    } catch (e) {
      console.error("Error loading sections:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const data = await database.teachers.list();
      setTeachers(data);
    } catch (e) {
      console.error("Error loading teachers for sections:", e);
    }
  };

  useEffect(() => {
    (async () => {
      await loadSections();
      await loadTeachers();
    })();
  }, []);

  const handleOpenCreateForm = () => {
    setFormData({
      name: '',
      program: '',
      teacher_id: ''
    });
    setEditingSection(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (section) => {
    setFormData({
      name: section.name,
      program: section.program,
      teacher_id: section.teacher_id || ''
    });
    setEditingSection(section);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this section? Deleting this section will unassign any currently enrolled students, but will not delete the student profiles.")) {
      const res = await database.sections.delete(id);
      if (res.success) {
        await loadSections();
      } else {
        alert("Delete failed: " + res.error);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.program) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingSection) {
        // Update
        const res = await database.sections.update(editingSection.id, formData);
        if (res.success) {
          setIsFormOpen(false);
          await loadSections();
        } else {
          alert("Update failed: " + res.error);
        }
      } else {
        // Create
        const res = await database.sections.create(formData);
        if (res.success) {
          setIsFormOpen(false);
          await loadSections();
        } else {
          alert("Creation failed: " + res.error);
        }
      }
    } catch (err) {
      alert("Error submitting section: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSections = sections.filter(sec => {
    return `${sec.name} ${sec.program}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
  const isEditable = norm === 'admin' || norm === 'data_entry';

  return (
    <>
      {!isFormOpen && (
        <div className="fade-in">
          <h1 className="section-title">Sections Registry</h1>

          {/* FILTER & ACTIONS BAR */}
          <div style={styles.filterBar} className={`glass-panel filter-bar ${!loading && filteredSections.length === 0 ? 'configBarExpanded' : ''}`}>
            <div style={styles.searchBox} className="filter-bar__search">
              <Search size={16} color="#64748b" />
              <input autoComplete="off"
                type="text"
                placeholder="Search by section name or program..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.filtersGroup} className="filter-bar__controls">
              {isEditable && (
                <button onClick={handleOpenCreateForm} className="btn-primary">
                  <PlusCircle size={16} /> Create Section
                </button>
              )}
            </div>
          </div>

          {/* SECTIONS CARD GRID */}
          {loading ? (
            <LoadingSpinner message="Loading sections..." />
          ) : filteredSections.length === 0 ? (
            <EmptyState
              icon={sections.length === 0 ? Layers : Search}
              title={sections.length === 0 ? "No sections registered" : "No matching sections found"}
              message={sections.length === 0 ? "Create a new section to begin assigning students." : "Try adjusting your search query."}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Section Name',
                  type: 'avatar',
                  subtextKey: 'program',
                  sortable: true
                },
                {
                  key: 'program',
                  header: 'Program / Grade',
                  type: 'badge',
                  sortable: true
                },
                {
                  key: 'teacher',
                  header: 'Assigned Teacher',
                  sortable: true,
                  render: (sec) => sec.teachers?.users?.full_name || 'Unassigned'
                },
                {
                  key: 'students',
                  header: 'Enrolled Students',
                  sortable: true,
                  render: (sec) => `${sec.students?.length || 0} enrolled`
                }
              ]}
              data={filteredSections}
              emptyIcon={Layers}
              emptyTitle="No sections found"
              emptyMessage="No matching sections found."
              renderActions={(sec) => (
                <>
                  <button
                    onClick={() => setActiveSection(sec)}
                    className="action-btn-icon action-view"
                    data-tooltip="View Details"
                    aria-label="View Details"
                  >
                    <Eye size={15} />
                  </button>
                  {isEditable && (
                    <>
                      <button
                        onClick={() => handleOpenEditForm(sec)}
                        className="action-btn-icon action-edit"
                        data-tooltip="Edit Section"
                        aria-label="Edit Section"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(sec.id)}
                        className="action-btn-icon action-delete"
                        data-tooltip="Delete Section"
                        aria-label="Delete Section"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </>
              )}
            />
          )}

          {/* SECTION REGISTRY DETAIL DRAWER */}
          <Drawer
            isOpen={!!activeSection}
            onClose={() => setActiveSection(null)}
            title="Section Registry Details"
            subtitle={activeSection?.program || ''}
          >
            {activeSection && (
              <>
                <div style={styles.profileCard}>
                  <div style={styles.profileAvatar}>
                    {activeSection.name?.charAt(0) || 'S'}
                  </div>
                  <h4 style={styles.profileName}>{activeSection.name}</h4>
                  <Badge label={activeSection.program || 'GENERAL'} type="info" />
                </div>

                <div style={styles.detailsGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Section Name</span>
                    <span style={styles.detailVal}>{activeSection.name}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Educational Program</span>
                    <span style={styles.detailVal}>{activeSection.program || 'Not Specified'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Assigned Instructor</span>
                    <span style={styles.detailVal}>{activeSection.teacher_name || 'Unassigned'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Enrolled Students</span>
                    <span style={styles.detailVal}>{activeSection.students?.length || 0} Students</span>
                  </div>
                </div>
              </>
            )}
          </Drawer>
        </div>
      )}

      {/* CREATE / EDIT SECTION FORM MODAL */}
      {isFormOpen && (
        <div style={styles.modalOverlay} className="fade-in">
          <div className="glass-panel modal-card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingSection ? 'Edit Section Details' : 'Create New Section'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={styles.closeBtn} className="btn-icon-only" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form autoComplete="off" onSubmit={handleFormSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label">Section Name *</label>
                <input autoComplete="off"
                  type="text"
                  required
                  placeholder="e.g. Hifz Section A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Program Type *</label>
                  <input autoComplete="off"
                    type="text"
                    required
                    placeholder="e.g. Hifz, Nazra, Primary"
                    value={formData.program}
                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assign Teacher</label>
                  <div className="select-wrapper">
                    <select
                      value={formData.teacher_id}
                      onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Unassigned</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.subject || 'Instructor'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
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
                    editingSection ? 'Update Section' : 'Create Section'
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
    flexDirection: 'column',
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
  }
};
