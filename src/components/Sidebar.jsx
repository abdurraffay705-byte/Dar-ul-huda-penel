import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  GraduationCap,
  CreditCard,
  CheckSquare,
  HeartHandshake,
  FileText,
  LogOut,
  BookOpen,
  Layers
} from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const roleDisplay = {
    admin: 'Administrator',
    teacher: 'Instructor / Teacher',
    student: 'Student / Parent',
    data_entry: 'Data Entry Operator'
  };


  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher'] },
    { id: 'users', label: 'Users Management', icon: Users, roles: ['admin'] },
    { id: 'students', label: 'Students Roster', icon: GraduationCap, roles: ['admin', 'data_entry'] },
    { id: 'teachers', label: 'Teachers Registry', icon: UserSquare2, roles: ['admin', 'data_entry'] },
    { id: 'courses', label: 'Courses Registry', icon: BookOpen, roles: ['admin'] },
    { id: 'my-section', label: 'My Section', icon: Layers, roles: ['teacher'] },
    { id: 'sections', label: 'Sections Registry', icon: Layers, roles: ['admin', 'data_entry'] },
    { id: 'attendance', label: 'Attendance Ledger', icon: CheckSquare, roles: ['admin', 'teacher', 'data_entry'] },
    { id: 'student-attendance', label: 'My Attendance', icon: CheckSquare, roles: ['student'] },
    { id: 'student-fees', label: 'My Fee Voucher', icon: CreditCard, roles: ['student'] },
    { id: 'fees', label: 'Tuition Fees', icon: CreditCard, roles: ['admin', 'data_entry'] },
    { id: 'donations', label: 'Donation Funds', icon: HeartHandshake, roles: ['admin', 'data_entry'] },
    { id: 'cms', label: 'CMS Notice Board', icon: FileText, roles: ['admin', 'data_entry', 'student'] }
  ];

  // Filter items based on user role
  const userRoleNormalized = user.role?.toLowerCase().replace(/[- ]/g, '_') || '';
  const visibleItems = menuItems.filter(item => item.roles.includes(userRoleNormalized));

  return (
    <div style={styles.sidebar}>
      {/* BRANDING SECTION WITH REAL CROWN LOGO */}
      <div style={styles.brand}>
        <img
          src={logoImg}
          style={styles.logoImg}
          alt="Dar-ul-Huda Trust Logo"
        />
        <div style={styles.brandTextWrapper}>
          <h2 style={styles.brandTitle} className="brand-title">DAR UL HUDA</h2>
          <span style={styles.brandSubtitle}>QURANIC TRUST</span>
        </div>
      </div>

      {/* USER PROFILE INFO */}
      <div style={styles.profileBox}>
        <div style={styles.avatar}>
          {user.email.charAt(0).toUpperCase()}
        </div>
        <div style={styles.profileText}>
          <div style={styles.profileName} title={user.email}>
            {user.email.split('@')[0]}
          </div>
          <span style={styles.roleBadge} className={userRoleNormalized === 'admin' ? 'badge warning' : 'badge success'}>
            {roleDisplay[userRoleNormalized] || user.role}
          </span>
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <div style={styles.navMenu}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === '/' + item.id || (location.pathname === '/' && item.id === 'dashboard');
          return (
            <button key={item.id} onClick={() => { setActiveTab(item.id); navigate('/' + item.id); }} style={{ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) }} className="sidebar-nav-button">
              <Icon size={18} color={isActive ? '#d4af37' : '#94a3b8'} style={{ transition: 'color 0.2s' }} />
              <span style={styles.navLabel}>{item.label}</span>
              {isActive && <div style={styles.activeIndicator} />}
            </button>
          );
        })}
      </div>

      {/* FOOTER & LOGOUT */}
      <div style={styles.footer}>
        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={16} style={{ marginRight: 8 }} /> Sign Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: '270px',
    backgroundColor: '#04382b',
    color: 'var(--color-text-light)',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    borderRight: '1px solid rgba(212, 175, 55, 0.15)',
    zIndex: 100,
    boxShadow: '4px 0 10px rgba(0, 0, 0, 0.1)'
  },
  brand: {
    padding: '1.25rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  logoImg: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--color-accent-gold)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
  },
  brandTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    margin: 0,
    lineHeight: 1,
    color: '#daba53',
    WebkitTextFillColor: '#daba53'
  },
  brandSubtitle: {
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    color: '#a7f3d0',
    fontWeight: '600',
    lineHeight: 1
  },
  brandTextWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    lineHeight: 1
  },
  profileBox: {
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'transparent',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#b45309',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.1rem',
    border: '1px solid var(--color-accent-gold)'
  },
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  profileName: {
    fontWeight: '600',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  roleBadge: {
    fontSize: '0.65rem',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    marginTop: '0.15rem',
    display: 'inline-block',
    alignSelf: 'flex-start'
  },
  navMenu: {
    flex: 1,
    padding: '1.5rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    overflowY: 'auto'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    color: '#cbd5e1',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '0.92rem',
    fontWeight: '500',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    position: 'relative',
    outline: 'none'
  },
  navLinkActive: {
    background: 'rgba(212, 175, 55, 0.12)',
    color: '#d4af37',
    fontWeight: '600'
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: '3px',
    backgroundColor: '#d4af37',
    borderRadius: '0 4px 4px 0'
  },
  navLabel: {
    flex: 1
  },
  footer: {
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    backgroundColor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  }
};
