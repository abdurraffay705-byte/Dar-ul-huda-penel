import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, database } from './supabaseClient';
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
import MyChatLanding from './components/MyChatLanding';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLiveDb] = useState(() => database.isLive());

  function setDefaultTabForRole(role) {
    let defaultTab = 'dashboard';
    if (role === 'teacher') defaultTab = 'students';
    else if (role === 'student') defaultTab = 'fees';
    setActiveTab(defaultTab);
  }

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const currentUser = await auth.getCurrentUser();
      if (!mounted) return;

      if (currentUser) {
        setUser(currentUser);
        setDefaultTabForRole(currentUser.role);
      }

      setAuthLoading(false);
    };

    restoreSession();

    const subscription = auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const currentUser = await auth.getCurrentUser();
        if (!mounted) return;

        setUser(currentUser);
        if (currentUser) {
          setDefaultTabForRole(currentUser.role);
        }
        setAuthLoading(false);
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
        <Route
          path="/login"
          element={
            authLoading ? (
              <div style={styles.loadingScreen}>Checking your session...</div>
            ) : user ? (
              <Navigate to={`/${activeTab}`} replace />
            ) : (
              <Login onLogin={handleLogin} isLiveDb={isLiveDb} />
            )
          }
        />
        <Route path="/mychat" element={<MyChatLanding />} />
        <Route
          path="/*"
          element={
            authLoading ? (
              <div style={styles.loadingScreen}>Checking your session...</div>
            ) : user ? (
              <div style={styles.appContainer}>
                {/* SIDEBAR FOR DESKTOP SCREEN */}
                <div style={styles.desktopSidebar}>
                  <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    user={user}
                    onLogout={handleLogout}
                    isLiveDb={isLiveDb}
                  />
                </div>

                {/* MOBILE HEADER BANNER */}
                <header style={styles.mobileHeader} className="no-print">
                  <button onClick={() => setMobileMenuOpen(true)} style={styles.menuToggle}>
                    <Menu size={22} color="var(--color-primary)" />
                  </button>
                  <span style={styles.mobileTitle} className="brand-title">DAR UL HUDA</span>
                  <div style={styles.mobileAvatar}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                </header>

                {/* MOBILE DRAWER SIDEBAR PANEL */}
                {mobileMenuOpen && (
                  <div style={styles.mobileDrawerOverlay} onClick={() => setMobileMenuOpen(false)}>
                    <div style={styles.mobileDrawer} onClick={(e) => e.stopPropagation()} className="fade-in">
                      <div style={styles.drawerCloseBar}>
                        <button onClick={() => setMobileMenuOpen(false)} style={styles.menuCloseBtn}>
                          <X size={22} />
                        </button>
                      </div>

                      <Sidebar
                        activeTab={activeTab}
                        setActiveTab={(tab) => {
                          setActiveTab(tab);
                          setMobileMenuOpen(false);
                        }}
                        user={user}
                        onLogout={handleLogout}
                        isLiveDb={isLiveDb}
                      />
                    </div>
                  </div>
                )}

                {/* MAIN CONTENT WORKSPACE VIEWPORT */}
                <main style={styles.mainContent}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardHome setActiveTab={setActiveTab} />} />
                    <Route path="/students" element={<StudentsModule userRole={user.role} />} />
                    <Route path="/teachers" element={<TeachersModule userRole={user.role} />} />
                    <Route path="/users" element={<UsersModule userRole={user.role} />} />
                    <Route path="/fees" element={<FeesModule userRole={user.role} />} />
                    <Route path="/attendance" element={<AttendanceModule userRole={user.role} />} />
                    <Route path="/donations" element={<DonationsModule userRole={user.role} />} />
                    <Route path="/cms" element={<CMSModule userRole={user.role} />} />
                    <Route path="/courses" element={<CoursesModule userRole={user.role} />} />
                    <Route path="/settings" element={<SettingsModule />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
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
    letterSpacing: '0.05em'
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex'
  },
  mobileDrawer: {
    position: 'relative',
    height: '100%',
    width: '270px'
  },
  drawerCloseBar: {
    position: 'absolute',
    top: '1.25rem',
    right: '-45px',
    zIndex: 1001
  },
  menuCloseBtn: {
    background: 'rgba(4, 56, 43, 0.85)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
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
@media (min-width: 993px) {
  main {
    margin-left: 270px !important;
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = responsiveStyles;
document.head.appendChild(styleSheet);
