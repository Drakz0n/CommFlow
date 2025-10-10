import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

    // Trigger fallback UI without throwing; store error for details
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
        // Surface potential security issues without spamming logs
    if (error.name === 'SecurityError' || error.message.includes('blocked')) {
      console.warn('[SECURITY] Error caught by boundary:', error.message);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#2a2f3a',
          color: '#fff',
          textAlign: 'center',
          fontFamily: 'NeverMindHand, Roboto, Arial, sans-serif'
        }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an error and couldn't continue.</p>
          <details style={{ marginTop: '10px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              Error Details (for debugging)
            </summary>
            <pre style={{ 
              backgroundColor: '#1a1a1a', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {this.state.error?.stack || this.state.error?.message || 'Unknown error'}
            </pre>
          </details>
          <button
            onClick={() => {
              // Hard reload ensures app resets from a known state
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#00acc1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'NeverMindHand, Roboto, Arial, sans-serif'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
