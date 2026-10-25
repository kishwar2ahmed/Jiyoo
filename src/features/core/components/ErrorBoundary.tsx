import { formatErrorMessage } from '../../../utils/errorFormatter';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in JIYOO App:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) { console.error(e); }
    window.location.href = './';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          backgroundColor: '#FAF8F5',
          color: '#1C1917',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E7E3DA'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1C1917' }}>
              JIYOO Storefront
            </h1>
            <p style={{ fontSize: '13px', color: '#78716C', marginBottom: '20px', lineHeight: '1.5' }}>
              The application encountered a temporary display issue. Click below to reload or reset cached data.
            </p>
            {this.state.error && (
              <pre style={{
                fontSize: '11px',
                backgroundColor: '#F5F5F0',
                padding: '12px',
                borderRadius: '8px',
                overflowX: 'auto',
                textAlign: 'left',
                color: '#B91C1C',
                marginBottom: '20px',
                maxHeight: '120px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {formatErrorMessage(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#1C1917',
                  color: '#FAF8F5',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#F5F5F0',
                  color: '#44403C',
                  border: '1px solid #E7E3DA',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
