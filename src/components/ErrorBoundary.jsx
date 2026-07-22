import React, { Component } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Generic error boundary to catch rendering errors in child components.
 * Displays a centered fallback UI with a loader and an error message.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Optionally log error details to an external service.
    console.error('[ErrorBoundary] caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-base)',
        color: 'var(--color-primary)',
        textAlign: 'center',
        padding: '2rem',
      };
      return (
        <div style={containerStyle} role="alert">
          <Loader2 className="animate-spin" size={48} strokeWidth={2} />
          <h2 style={{ marginTop: '1rem' }}>Something went wrong.</h2>
          <p style={{ marginTop: '0.5rem' }}>{this.state.error?.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
