import { Loader2 } from 'lucide-react';

/**
 * Shared reusable LoadingSpinner component for centering loading state in content area
 *
 * Props:
 * - message: string (optional textual message, default: "Loading data...")
 * - minHeight: string | number (container minimum height, default: '350px')
 */
export default function LoadingSpinner({
  message = "Loading data...",
  minHeight = "100%"
}) {
  return (
    <div className="loading-spinner-container" style={{ minHeight }}>
      <div className="loading-spinner-content">
        <Loader2 size={36} className="spinner loading-spinner-icon" color="var(--color-primary)" />
        {message && <p className="loading-spinner-message">{message}</p>}
      </div>
    </div>
  );
}
