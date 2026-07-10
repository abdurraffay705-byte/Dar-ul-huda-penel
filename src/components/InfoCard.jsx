import React from 'react';
import Badge from './Badge';

export default function InfoCard({
  avatarInitial,
  name,
  badgeLabel,
  badgeType,
  infoRows = [],
  actions = [],
  subtitle,
  description,
  style = {}
}) {
  return (
    <div className="glass-panel" style={{ ...styles.card, ...style }}>
      <div style={styles.cardHeader}>
        {avatarInitial && (
          <div style={styles.avatar}>
            {avatarInitial}
          </div>
        )}
        <div style={styles.headerInfo}>
          <h3 style={styles.name}>{name}</h3>
          {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
          {badgeLabel && <Badge label={badgeLabel} type={badgeType || badgeLabel} />}
        </div>
      </div>

      <div style={styles.cardBody}>
        {description && <p style={styles.description}>{description}</p>}
        {infoRows.map((row, idx) => {
          const Icon = row.icon;
          return (
            <div key={idx} style={styles.infoRow}>
              {Icon && <Icon size={14} color={row.iconColor || "#64748b"} />}
              <span style={styles.infoLabel}>{row.label}:</span>
              <span style={{ ...styles.infoVal, ...row.valueStyle }} title={String(row.value || '')}>
                {row.value || '-'}
              </span>
            </div>
          );
        })}
      </div>

      {actions && actions.length > 0 && (
        <div style={styles.cardActions}>
          {actions.map((act, idx) => {
            const Icon = act.icon;
            let btnStyle = styles.secondaryBtn;
            if (act.variant === 'primary') {
              btnStyle = styles.primaryBtn;
            } else if (act.variant === 'danger') {
              btnStyle = styles.deleteBtn;
            } else if (act.variant === 'success') {
              btnStyle = styles.successBtn;
            }
            return (
              <button
                key={idx}
                onClick={act.onClick}
                style={{ ...btnStyle, ...act.style }}
                title={act.title}
                className={act.variant === 'primary' ? 'btn-primary' : act.variant === 'success' ? 'btn-success' : 'btn-secondary'}
              >
                {Icon && <Icon size={14} />}
                {act.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '250px',
    height: '100%'
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
  avatar: {
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
    border: '1px solid var(--color-accent-gold)',
    flexShrink: 0
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    alignItems: 'flex-start'
  },
  name: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-primary)',
    lineHeight: '1.2'
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
    flexGrow: 1
  },
  description: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    marginBottom: '0.5rem',
    whiteSpace: 'pre-line'
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
    flexWrap: 'wrap',
    gap: '0.5rem',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem',
    marginTop: 'auto'
  },
  secondaryBtn: {
    flex: '1 1 auto',
    fontSize: '0.8rem',
    justifyContent: 'center',
    padding: '0.4rem 0.8rem'
  },
  primaryBtn: {
    flex: '1 1 auto',
    fontSize: '0.8rem',
    justifyContent: 'center',
    padding: '0.4rem 0.8rem'
  },
  successBtn: {
    flex: '1 1 auto',
    fontSize: '0.8rem',
    justifyContent: 'center',
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    color: '#059669',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: '500',
    transition: 'all 0.15s'
  },
  deleteBtn: {
    flex: '1 1 auto',
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
    transition: 'all 0.15s',
    justifyContent: 'center'
  }
};
