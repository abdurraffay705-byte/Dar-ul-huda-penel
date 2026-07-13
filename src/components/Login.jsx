import { useState } from 'react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.jpg';
import { auth } from '../supabaseClient';
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const user = await auth.signIn(email, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.decorLeft}></div>
      <div style={styles.decorRight}></div>

      <div style={styles.card} className="glass-panel fade-in">
        <div style={styles.logoSection}>
          <img
            src={logoImg}
            style={styles.logoImg}
            alt="Dar-ul-Huda Trust Logo"
          />
          <h1 style={styles.title}>DAR UL HUDA</h1>
          <p style={styles.subtitle}>QURANIC TRUST EDUCATION</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
          <div className="form-group">
            <label className="form-label" style={styles.label}>
              <Mail size={16} style={{ marginRight: 6 }} /> Email Address
            </label>
            <input autoComplete="off"
              type="email"
              placeholder="e.g., admin@darulhuda.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={styles.input}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={styles.label}>
              <Lock size={16} style={{ marginRight: 6 }} /> Password
            </label>
            <input autoComplete="off"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              style={styles.input}
              required
              autoComplete="new-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn-accent" 
            style={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spinner" />
                Logging in...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>


      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 10% 20%, #032b21 0%, #054030 90%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem'
  },
  decorLeft: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(0,0,0,0) 70%)',
    top: '-50px',
    left: '-50px',
    pointerEvents: 'none'
  },
  decorRight: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(0,0,0,0) 70%)',
    bottom: '-100px',
    right: '-100px',
    pointerEvents: 'none'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '2.5rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    background: 'rgba(255, 255, 255, 0.96)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  logoSection: {
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logoImg: {
    width: '82px',
    height: '82px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '1.75rem',
    border: '3px solid var(--color-accent-gold)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
    filter: 'drop-shadow(0 2px 8px rgba(212, 175, 55, 0.3))'
  },
  title: {
    fontSize: '1.85rem',
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
    lineHeight: 1.25,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: '#daba53',
    WebkitTextFillColor: '#daba53'
  },
  subtitle: {
    fontSize: '0.72rem',
    letterSpacing: '0.18em',
    fontWeight: '700',
    color: '#064e3b'
  },
  form: {
    textAlign: 'left'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.25rem',
    fontSize: '0.85rem'
  },
  input: {
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-sm)',
    padding: '0.65rem 0.8rem',
    border: '1px solid #cbd5e1'
  },
  submitBtn: {
    width: '100%',
    borderRadius: 'var(--radius-sm)',
    fontSize: '1rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
    textAlign: 'left',
    borderLeft: '4px solid #ef4444'
  },
  dbBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: '0.3rem 0.75rem',
    borderRadius: '9999px',
    marginTop: '1.25rem'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.75rem 0 1rem 0'
  },
  dividerText: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: '0.15em',
    padding: '0 0.75rem',
    margin: '0 auto',
    backgroundColor: '#fff',
    zIndex: 1,
    position: 'relative'
  },
  bypassGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  bypassBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.6rem 0.4rem',
    background: '#fcfcfc',
    border: '1px solid #e2e8f0',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#334155',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  }
};
