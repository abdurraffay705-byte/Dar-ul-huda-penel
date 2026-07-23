import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { FileText, PlusCircle, Trash2, Calendar, AlertTriangle, BellRing, Edit3, ChevronDown, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';
import Select from './ui/Select';


export default function CMSModule({ userRole }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Notice Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const data = await database.cms.list();
      setNotices(data);
    } catch (e) {
      console.error("Error loading CMS notices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadNotices();
    })();
  }, []);

  const handleOpenEdit = (notice) => {
    setTitle(notice.title || '');
    setContent(notice.content || '');
    setUrgency(notice.urgency || 'Medium');
    setEditingNotice(notice);
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Please enter both title and content for the notice.");
      return;
    }

    try {
      setSubmitting(true);
      const noticePayload = {
        title,
        content,
        urgency,
        published_date: editingNotice ? editingNotice.published_date : new Date().toISOString().split('T')[0]
      };

      if (editingNotice) {
        const res = await database.cms.update(editingNotice.id, noticePayload);
        if (res.success) {
          setTitle('');
          setContent('');
          setUrgency('Medium');
          setEditingNotice(null);
          loadNotices();
        } else {
          alert("Failed to update notice: " + res.error);
        }
      } else {
        const res = await database.cms.create(noticePayload);
        if (res.success) {
          setTitle('');
          setContent('');
          setUrgency('Medium');
          loadNotices();
        } else {
          alert("Failed to publish announcement: " + res.error);
        }
      }
    } catch (e) {
      console.error("Error creating notice:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to pull down this notice announcement from the public notice board?")) {
      const res = await database.cms.delete(id);
      if (res.success) {
        loadNotices();
      } else {
        alert("Failed to delete notice: " + res.error);
      }
    }
  };

  const norm = userRole?.toLowerCase().replace(/[- ]/g, '_') || '';
  const isEditable = norm === 'admin' || norm === 'data_entry';
  const isAdmin = norm === 'admin';

  return (
    <div className="fade-in" style={styles.container}>
      <h1 className="section-title">CMS Notice Board</h1>

      <div style={styles.layout}>
        {/* PUBLISH NOTICE FORM — full width, always visible to editors */}
        {isEditable ? (
          <div className="glass-panel" style={styles.editorBox}>
           <h3 style={styles.boxTitle}><PlusCircle size={16} color="var(--color-accent)" style={{ marginRight: 6 }} /> {editingNotice ? 'Edit Announcement Notice' : 'Publish Notice'}</h3>
            
            <form autoComplete="off" onSubmit={handlePostNotice} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input autoComplete="off"
                  type="text"
                  required
                  placeholder="e.g. Eid Holidays Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Urgency Priority Level</label>
                <Select
                  items={[
                    { value: 'High', label: '🔴 High Priority (Red Alert banner)' },
                    { value: 'Medium', label: '🟡 Medium Priority (Gold info banner)' },
                    { value: 'Low', label: '🔵 Low Priority (Standard announcement)' }
                  ]}
                  value={urgency}
                  onChange={setUrgency}
                  placeholder="Select urgency"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notice Body Description *</label>
                <textarea
                  required
                  rows="5"
                  placeholder="Type the full announcement message here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              {editingNotice && (
                <button 
                  type="button" 
                  onClick={() => {
                    setTitle('');
                    setContent('');
                    setUrgency('Medium');
                    setEditingNotice(null);
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '0.45rem' }}
                >
                  Cancel Edit
                </button>
              )}

              <button 
                type="submit" 
                disabled={submitting} 
                className="btn-accent" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Broadcasting notice...
                  </>
                ) : (
                  <>
                    <BellRing size={16} />
                    {editingNotice ? 'Save Changes' : 'Publish Announcement'}
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel" style={styles.viewerWelcome}>
            <FileText size={48} color="var(--color-primary-light)" style={{ marginBottom: '1rem' }} />
            <h3 style={styles.viewerWelcomeTitle}>Official Notice Board</h3>
            <p style={styles.viewerWelcomeText}>
              Welcome to the official Dar ul Huda announcement portal. Read standard school notice updates, holidays, syllabus notes, and news guidelines published by the administrator.
            </p>
          </div>
        )}

        {/* NOTICES TIMELINE — always visible */}
        <div style={styles.timelineArea}>
          <h3 style={styles.boxTitle}><BellRing size={16} color="var(--color-primary-light)" style={{ marginRight: 6 }} /> Active Announcements</h3>

          {loading ? (
            <LoadingSpinner message="Loading announcements..." />
          ) : notices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No announcements published"
              message="Publish a new announcement notice to display on the board."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Announcement Title',
                  type: 'avatar',
                  subtextKey: 'content',
                  sortable: true
                },
                {
                  key: 'urgency',
                  header: 'Urgency Priority',
                  type: 'badge',
                  sortable: true
                },
                {
                  key: 'published_date',
                  header: 'Published Date',
                  sortable: true
                }
              ]}
              data={notices}
              emptyIcon={FileText}
              emptyTitle="No announcements published"
              emptyMessage="Publish a new announcement notice to display on the board."
              renderActions={(n) => (
                <>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(n)}
                        className="action-btn-icon action-edit"
                        data-tooltip="Edit Notice"
                        aria-label="Edit Notice"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="action-btn-icon action-delete"
                        data-tooltip="Delete Announcement"
                        aria-label="Delete Announcement"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0 0.5rem'
  },
  layout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  // Styles moved to .cms-content-layout in index.css
  editorBox: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-md)',
    width: '100%'
  },
  viewerWelcome: {
    backgroundColor: '#fff',
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px'
  },
  viewerWelcomeTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '0.5rem'
  },
  viewerWelcomeText: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5
  },
  boxTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '0.5rem'
  },
  timelineArea: {
    width: '100%'
  },
  noticeStream: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  noticeCard: {
    padding: '1.5rem',
    borderLeft: '5px solid #cbd5e1',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  noticeMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  noticeDate: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },
  noticeTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '0.6rem'
  },
  noticeBody: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    whiteSpace: 'pre-line'
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.6rem',
    marginTop: '1rem'
  },
  deleteBtn: {
    background: 'none',
    color: 'var(--color-danger)',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    transition: 'all 0.15s'
  },
  editBtn: {
    background: 'none',
    color: '#059669',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    transition: 'all 0.15s'
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
