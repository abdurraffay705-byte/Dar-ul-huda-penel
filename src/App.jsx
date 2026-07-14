import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './supabaseClient';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';
import StudentsModule from './components/StudentsModule';
import TeachersModule from './components/TeachersModule';
import UsersModule from './components/UsersModule';
import FeesModule from './components/FeesModule';
import AttendanceModule from './components/AttendanceModule';
import DonationsModule from './components/DonationsModule';
import CMSModule from './components/CMSModule';
import SettingsModule from './components/SettingsModule';
import CoursesModule from './components/CoursesModule';
import SectionsModule from './components/SectionsModule';
import MySectionModule from './components/MySectionModule';
import StudentAttendanceModule from './components/StudentAttendanceModule';
import StudentFeesModule from './components/StudentFeesModule';

import { Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routeRoles = {
    '/dashboard': ['admin', 'teacher'],
    '/users': ['admin'],
    '/students': ['admin', 'data_entry'],
    '/teachers': ['admin', 'data_entry'],
    '/courses': ['admin'],
    '/attendance': ['admin', 'teacher', 'data_entry'],
    '/fees': ['admin', 'data_entry'],
    '/donations': ['admin', 'data_entry'],
    '/cms': ['admin', 'data_entry'],
    '/settings': ['admin'],
    '/sections': ['admin', 'data_entry'],
    '/my-section': ['teacher'],
    '/student-attendance': ['student'],
    '/student-fees': ['student']
  };

  function getDefaultTabForRole(role) {
    const normRole = role?.toLowerCase().replace(/[- ]/g, '_') || '';
    if (normRole === 'teacher') return 'dashboard';
    if (normRole === 'student') return 'student-attendance';
    if (normRole === 'data_entry') return 'students';
    return 'dashboard';
  }

  function setDefaultTabForRole(role) {
    setActiveTab(getDefaultTabForRole(role));
  }

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const currentUser = await auth.getCurrentUser();
        if (!mounted) return;

        if (currentUser) {
          setUser(currentUser);
          setDefaultTabForRole(currentUser.role);
        }
      } catch (err) {
        console.error('[Auth] restoreSession failed:', err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    restoreSession();

    const subscription = auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          const currentUser = await auth.getCurrentUser();
          if (!mounted) return;

          setUser(currentUser);
          if (currentUser) {
            setDefaultTabForRole(currentUser.role);
          }
        } catch (err) {
          console.error('[Auth] onAuthStateChange failed:', err);
          if (mounted) setUser(null);
        } finally {
          if (mounted) setAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (sessionData) => {
    setUser(sessionData);
    setDefaultTabForRole(sessionData.role);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  // Application with routing and protection
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={
            authLoading ? (
              <div style={styles.loadingScreen}>Checking your session...</div>
            ) : user ? (
              <Navigate to={`/${getDefaultTabForRole(user.role)}`} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        {/* Root redirect */}
        <Route 
          path="/" 
          element={
            user ? (
              <Navigate to={`/${getDefaultTabForRole(user.role)}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Protected module routes — all top-level with absolute paths */}
        {[
          { path: '/dashboard', element: <DashboardHome setActiveTab={setActiveTab} userRole={user?.role} user={user} /> },
          { path: '/students', element: <StudentsModule userRole={user?.role} user={user} /> },
          { path: '/teachers', element: <TeachersModule userRole={user?.role} /> },
          { path: '/users', element: <UsersModule userRole={user?.role} /> },
          { path: '/fees', element: <FeesModule userRole={user?.role} /> },
          { path: '/attendance', element: <AttendanceModule userRole={user?.role} user={user} /> },
          { path: '/donations', element: <DonationsModule userRole={user?.role} /> },
          { path: '/cms', element: <CMSModule userRole={user?.role} /> },
          { path: '/courses', element: <CoursesModule userRole={user?.role} /> },
          { path: '/sections', element: <SectionsModule userRole={user?.role} user={user} /> },
          { path: '/my-section', element: <MySectionModule user={user} /> },
          { path: '/student-attendance', element: <StudentAttendanceModule user={user} /> },
          { path: '/student-fees', element: <StudentFeesModule user={user} /> },
          { path: '/settings', element: <SettingsModule /> },
        ].map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={
              authLoading ? (
                <div style={styles.loadingScreen}>Checking your session...</div>
              ) : user ? (
                // Verify route access
                (() => {
                  const norm = user.role?.toLowerCase().replace(/[- ]/g, '_') || '';
                  const allowed = routeRoles[path] || [];
                  if (!allowed.includes(norm)) {
                    return <Navigate to={`/${getDefaultTabForRole(user.role)}`} replace />;
                  }
                  return (
                    <div style={styles.appContainer}>
                      {/* SIDEBAR FOR DESKTOP SCREEN */}
                      <div style={styles.desktopSidebar}>
                        <Sidebar
                          activeTab={activeTab}
                          setActiveTab={setActiveTab}
                          user={user}
                          onLogout={handleLogout}
                        />
                      </div>

                      {/* MOBILE HEADER BANNER */}
                      <header style={styles.mobileHeader} className="no-print">
                        <button onClick={() => setMobileMenuOpen(true)} style={styles.menuToggle}>
                          <Menu size={22} color="var(--color-primary)" />
                        </button>
                        <span style={styles.mobileTitle}>DAR UL HUDA</span>
                        <div style={styles.mobileAvatar}>
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                      </header>

                      {/* MOBILE DRAWER SIDEBAR PANEL */}
                      {mobileMenuOpen && (
                        <div style={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
                          <div style={styles.mobileDrawer} onClick={(e) => e.stopPropagation()} className="fade-in">
                            {/* Close button inside drawer at top-right */}
                            <div style={styles.drawerCloseBar}>
                              <button onClick={() => setMobileMenuOpen(false)} style={styles.menuCloseBtn} className="btn-icon-only" aria-label="Close menu">
                                <X size={20} />
                              </button>
                            </div>
                            {/* Scrollable sidebar content */}
                            <div style={styles.drawerInner} className="drawer-inner">
                              <Sidebar
                                activeTab={activeTab}
                                setActiveTab={(tab) => {
                                  setActiveTab(tab);
                                  setMobileMenuOpen(false);
                                }}
                                user={user}
                                onLogout={handleLogout}
                              />
                            </div>
                          </div>
                          {/* Tap outside area to close */}
                          <div style={styles.drawerDismissArea} onClick={() => setMobileMenuOpen(false)} />
                        </div>
                      )}

                      {/* MAIN CONTENT WORKSPACE VIEWPORT */}
                      <main style={styles.mainContent}>
                        {element}
                      </main>
                    </div>
                  );
                })()
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-primary)',
    fontWeight: '700'
  },
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative'
  },
  desktopSidebar: {
    display: 'block',
    width: '270px',
    flexShrink: 0
    // Hidden below 992px via the injected responsiveStyles CSS at the bottom of this file
    // (React inline style objects can't contain @media rules directly)
  },
  mobileHeader: {
    display: 'none',
    width: '100%',
    height: '60px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid var(--color-border)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 99,
    padding: '0 1rem',
    alignItems: 'center',
    justifyContent: 'space-between'
    // Shown below 992px via the injected responsiveStyles CSS at the bottom of this file
  },
  menuToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  mobileTitle: {
    fontSize: '1.2rem',
    letterSpacing: '0.05em',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: '#daba53',
    WebkitTextFillColor: '#daba53'
  },
  mobileAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#b45309',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    border: '1px solid var(--color-accent-gold)'
  },
  mobileDrawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'stretch'
  },
  mobileDrawer: {
    position: 'relative',
    height: '100%',
    width: '270px',
    backgroundColor: '#04382b',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '4px 0 20px rgba(0,0,0,0.4)'
  },
  drawerInner: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  drawerDismissArea: {
    flex: 1,
    cursor: 'pointer'
  },
  drawerCloseBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.75rem 0.75rem 0 0.75rem',
    flexShrink: 0
  },
  menuCloseBtn: {
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0
  },
  mainContent: {
    flex: 1,
    padding: '2.5rem',
    backgroundColor: 'var(--color-bg-base)',
    marginLeft: '0px', // Default adjusted dynamically by viewport media queries via CSS
    minHeight: '100vh',
    overflowY: 'auto'
    // Mobile padding override (below 992px) applied via the injected responsiveStyles CSS below
  }
};

// Global CSS Responsive overrides injector (since we are pair programming using pure Vanilla CSS)
const responsiveStyles = `
@media (max-width: 992px) {
  #root > div > div:first-child {
    display: none !important;
  }
  main {
    padding: 5.5rem 1.25rem 2rem 1.25rem !important;
  }
  header {
    display: flex !important;
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = responsiveStyles;
document.head.appendChild(styleSheet);
