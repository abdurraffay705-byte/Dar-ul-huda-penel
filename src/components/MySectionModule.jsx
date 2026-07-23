import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, GraduationCap, Layers } from 'lucide-react';
import EmptyState from './EmptyState';
import DataTable from './DataTable';
import LoadingSpinner from './LoadingSpinner';

export default function MySectionModule({ user }) {
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadTeacherSectionData() {
      try {
        setLoading(true);
        if (!user?.id) return;

        // 1. Fetch teacher record using authenticated user ID
        const { data: teacherProfile, error: profErr } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profErr) throw profErr;

        if (teacherProfile) {
          // 2. Fetch sections assigned to this teacher
          const { data: sectionsData, error: secsErr } = await supabase
            .from('sections')
            .select('*, students(id)')
            .eq('teacher_id', teacherProfile.id);

          if (secsErr) throw secsErr;
          setSections(sectionsData || []);

          // 3. Fetch students belonging to these sections
          const sectionIds = (sectionsData || []).map(s => s.id);
          if (sectionIds.length > 0) {
            const { data: studentsData, error: studsErr } = await supabase
              .from('students')
              .select('*, users(*)')
              .in('section_id', sectionIds);

            if (studsErr) throw studsErr;
            setStudents(studentsData.map(s => ({
              ...s,
              full_name: s.users?.full_name || '',
              phone: s.users?.phone || ''
            })) || []);
          }
        }
      } catch (e) {
        console.error("Error loading teacher section data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherSectionData();
  }, [user]);

  const filteredStudents = students.filter(s => {
    return `${s.full_name} ${s.roll_number} ${s.father_name}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  return (
    <div className="fade-in">
      <h1 className="section-title">My Assigned Sections</h1>

      {loading ? (
        <LoadingSpinner message="Loading section rosters..." />
      ) : sections.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No assigned sections"
          message="You are not currently assigned to teach any section. Contact the administrator to assign you to a section."
        />
      ) : (
        <div style={styles.container}>
          {/* SECTION TABLE */}
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
                key: 'students',
                header: 'Enrolled Count',
                sortable: true,
                render: (sec) => `${sec.students?.length || 0} enrolled`
              }
            ]}
            data={sections}
            emptyIcon={Layers}
            emptyTitle="No assigned sections"
            emptyMessage="You are not assigned to teach any section."
          />

          {/* STUDENT LIST */}
          <div className="glass-panel" style={styles.studentsListCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}><GraduationCap size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> My Students Roster</h3>
              <div className="filter-bar__search" style={{ maxWidth: '280px' }}>
                <Search size={16} color="var(--color-text-muted)" />
                <input autoComplete="off"
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input-shared"
                />
              </div>
            </div>

            <div style={styles.tableContainer}>
              {filteredStudents.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No students found"
                  message="No matching students are currently enrolled in your sections."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Class</th>
                      <th>Father's Name</th>
                      <th>Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const matchedSection = sections.find(s => s.id === student.section_id);
                      return (
                        <tr key={student.id}>
                          <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{student.full_name}</td>
                          <td>
                            <span className="badge info" style={{ fontSize: '0.75rem' }}>
                              {student.roll_number}
                            </span>
                          </td>
                          <td>{student.class} {matchedSection ? `(${matchedSection.name})` : ''}</td>
                          <td>{student.father_name}</td>
                          <td>{student.phone || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  studentsListCard: {
    padding: '1.5rem',
    backgroundColor: '#fff'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--color-primary)'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.4rem 0.6rem',
    minWidth: '220px',
    backgroundColor: '#fff'
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.85rem',
    width: '100%',
    color: 'var(--color-text-main)'
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '0.5rem'
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
