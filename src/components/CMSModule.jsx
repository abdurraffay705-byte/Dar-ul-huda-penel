import { useState, useEffect } from 'react';
import { database } from '../supabaseClient';
import { FileText, PlusCircle, Trash2, Calendar, AlertTriangle, BellRing } from 'lucide-react';

export default function CMSModule({ userRole }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Notice Form Fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

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

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Please enter both title and content for the notice.");
      return;
    }

    try {
      setSubmitting(true);
      const newNotice = {
        title,
        content,
        urgency,
        published_date: new Date().toISOString().split('T')[0]
      };

      const res = await database.cms.create(newNotice);
      if (res.success) {
        setTitle('');
        setContent('');
        setUrgency('Medium');
        loadNotices();
      } else {
        alert("Failed to publish announcement: " + res.error);
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
            <h3 style={styles.boxTitle}><PlusCircle size={16} color="var(--color-accent)" style={{ marginRight: 6 }} /> Publish Notice</h3>
            
            <form onSubmit={handlePostNotice} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
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
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="form-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="High">🔴 High Priority (Red Alert banner)</option>
                  <option value="Medium">🟡 Medium Priority (Gold info banner)</option>
                  <option value="Low">🔵 Low Priority (Standard announcement)</option>
                </select>
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

              <button 
                type="submit" 
                disabled={submitting} 
                className="btn-accent" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <BellRing size={16} /> {submitting ? 'Broadcasting notice...' : 'Publish Announcement'}
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

        {/* NOTICES TIMELINE — only shown while loading or when notices exist */}
        {(loading || notices.length > 0) && (
          <div style={styles.timelineArea}>
            <h3 style={styles.boxTitle}><BellRing size={16} color="var(--color-primary-light)" style={{ marginRight: 6 }} /> Active Announcements</h3>

            {loading ? (
              <div style={styles.innerLoader}>
                <div className="spinner" style={styles.spinner}></div>
                <p style={{ marginTop: 10 }}>Loading timeline board...</p>
              </div>
            ) : (
              <div style={styles.noticeStream}>
                {notices.map((n) => (
                  <div 
                    key={n.id} 
                    className="glass-panel" 
                    style={{
                      ...styles.noticeCard,
                      borderLeftColor: n.urgency === 'High' ? 'var(--color-danger)' : (n.urgency === 'Medium' ? 'var(--color-warning)' : 'var(--color-info)'),
                      backgroundColor: n.urgency === 'High' ? '#fffbfb' : '#ffffff'
                    }}
                  >
                    <div style={styles.noticeMeta}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${n.urgency === 'High' ? 'danger' : (n.urgency === 'Medium' ? 'warning' : 'info')}`} style={{ fontSize: '0.65rem' }}>
                          {n.urgency} Urgency
                        </span>
                        {n.urgency === 'High' && <AlertTriangle size={14} color="var(--color-danger)" className="fade-in" style={{ animation: 'spin 4s linear infinite' }} />}
                      </div>
                      <span style={styles.noticeDate}>
                        <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {n.published_date}
                      </span>
                    </div>

                    <h3 style={styles.noticeTitle}>{n.title}</h3>
                    <p style={styles.noticeBody}>{n.content}</p>

                    {isAdmin && (
                      <div style={styles.cardActions}>
                        <button onClick={() => handleDelete(n.id)} style={styles.deleteBtn}>
                          <Trash2 size={13} style={{ marginRight: 4 }} /> Pull Down Announcement
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
