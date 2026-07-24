import { useEffect } from 'react';
import { X } from 'lucide-react';
import './Drawer.css';

/**
 * Reusable slide-out Drawer component
 *
 * Props:
 * - isOpen: boolean (controls visibility)
 * - onClose: function (callback when closing via backdrop, X button, or Escape)
 * - title: string | JSX
 * - subtitle: string | JSX (optional)
 * - children: JSX (drawer body content)
 * - footer: JSX (optional footer action buttons)
 * - width: string (optional custom width, default '420px')
 */
export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '420px'
}) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-portal">
      {/* Dimmed & Blurred Backdrop Overlay */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Slide-out Panel */}
      <div className="drawer-panel" style={{ '--drawer-width': width }}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-text">
            {title && <h3 className="drawer-title">{title}</h3>}
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="drawer-close-btn" aria-label="Close profile details">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="drawer-body">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="drawer-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
