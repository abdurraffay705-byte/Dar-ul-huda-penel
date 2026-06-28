import { Settings, Shield, Server, CheckCircle2, Copy, Check, Database, Key } from 'lucide-react';
import { useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export default function SettingsModule() {
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    const sqlText = `-- Dar ul Huda School Management System - Supabase Schema
-- Run this in your Supabase SQL Editor.
-- Full schema is saved in your project root at \`schema.sql\``;
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const projectRef = SUPABASE_URL
    ? SUPABASE_URL.replace('https://', '').split('.')[0]
    : null;

  return (
    <div className="fade-in" style={styles.container}>
      <h1 className="section-title">
        <Settings size={24} color="var(--color-accent)" /> Settings
      </h1>

      <div style={styles.settingsGrid}>
        {/* CONNECTION STATUS */}
        <div className="glass-panel" style={styles.card}>
          <h3 style={styles.cardTitle}>
            <Server size={18} color="var(--color-primary-light)" style={{ marginRight: 6 }} />
            Database Connection
          </h3>
          <p style={styles.cardDesc}>
            This application reads its Supabase connection from environment variables
            (<code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your{' '}
            <code>.env</code> file). No credentials are stored in code or in the browser.
          </p>

          <div style={{
            ...styles.statusBanner,
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.2)'
          }}>
            <div style={styles.statusRow}>
              <CheckCircle2 size={20} color="var(--color-success)" />
              <div>
                <strong style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>
                  STATUS: Supabase Live Connected
                </strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  All reads and writes go directly to your Supabase project.
                  {projectRef && (
                    <> Project ref: <code>{projectRef}</code></>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <Database size={14} style={{ marginRight: 4 }} />
              <span style={styles.infoLabel}>Project URL</span>
              <code style={styles.infoValue}>
                {SUPABASE_URL || '(not set)'}
              </code>
            </div>
            <div style={styles.infoItem}>
              <Key size={14} style={{ marginRight: 4 }} />
              <span style={styles.infoLabel}>Anon Key</span>
              <code style={styles.infoValue}>
                {import.meta.env.VITE_SUPABASE_ANON_KEY
                  ? '••••••••••••••••••••••••••••••••'
                  : '(not set)'}
              </code>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
            To change the connection, update your <code>.env</code> file and restart the dev server.
            Never commit <code>.env</code> to version control.
          </p>
        </div>

        {/* SETUP GUIDE */}
        <div className="glass-panel" style={styles.card}>
          <h3 style={styles.cardTitle}>
            <Shield size={18} color="var(--color-accent)" style={{ marginRight: 6 }} />
            Database Schema Guide
          </h3>
          <p style={styles.cardDesc}>
            The full database schema is in <code>schema.sql</code> at the project root.
            Run it in the Supabase SQL Editor to (re-)initialize all tables.
          </p>

          <h4 style={styles.instructionTitle}>Tables in this project:</h4>
          <ul style={styles.tableList}>
            {[
              ['users', 'Core profiles — all roles (admin, teacher, student)'],
              ['students', 'Student admission records → linked to users'],
              ['teachers', 'Teacher payroll records → linked to users'],
              ['courses', 'Course catalogue → linked to teachers'],
              ['attendance', 'Daily attendance ledger → linked to users'],
              ['fees', 'Fee invoices per student'],
              ['fee_payments', 'Individual payment transactions → linked to fees'],
              ['donations', 'Donor contribution log'],
              ['cms_notices', 'Internal notices and announcements'],
            ].map(([table, desc]) => (
              <li key={table} style={styles.tableItem}>
                <code style={styles.tableCode}>{table}</code>
                <span style={styles.tableDesc}>{desc}</span>
              </li>
            ))}
          </ul>

          <div style={styles.sqlHeader}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              Copy schema script hint:
            </span>
            <button onClick={handleCopySql} style={styles.copyBtn}>
              {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
              {' '}{copied ? 'Copied!' : 'Copy hint'}
            </button>
          </div>

          <pre style={styles.sqlCode}>
{`-- Run schema.sql in your Supabase SQL Editor.
-- File location: <project_root>/schema.sql
-- No manual changes needed if tables already exist.`}
          </pre>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0 0.5rem'
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '2rem',
    alignItems: 'flex-start'
  },
  card: {
    backgroundColor: '#fff',
    padding: '2rem',
    boxShadow: 'var(--shadow-md)'
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center'
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '1.25rem'
  },
  statusBanner: {
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    marginBottom: '1.5rem'
  },
  statusRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start'
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    flexWrap: 'wrap'
  },
  infoLabel: {
    fontWeight: 600,
    marginRight: '0.5rem',
    minWidth: 70
  },
  infoValue: {
    fontSize: '0.75rem',
    wordBreak: 'break-all'
  },
  instructionTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--color-accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    marginTop: '0.25rem'
  },
  tableList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  tableItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.8rem'
  },
  tableCode: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    color: 'var(--color-primary)',
    padding: '1px 6px',
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    minWidth: 110
  },
  tableDesc: {
    color: 'var(--color-text-muted)',
    lineHeight: 1.4
  },
  sqlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  copyBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--color-text-muted)',
    transition: 'all 0.15s'
  },
  sqlCode: {
    backgroundColor: 'var(--color-bg-base)',
    padding: '1rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    border: '1px solid var(--color-border)',
    fontFamily: 'monospace',
    color: '#0f766e',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.4
  }
};
