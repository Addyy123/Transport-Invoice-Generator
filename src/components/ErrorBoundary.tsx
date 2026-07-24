import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '40px', color: 'red', fontFamily: 'monospace'}}>
          <h1 style={{fontSize: '24px', marginBottom: '20px'}}>App Crashed</h1>
          <p style={{fontSize: '18px', fontWeight: 'bold'}}>{this.state.error?.message}</p>
          <pre style={{marginTop: '20px', whiteSpace: 'pre-wrap', background: '#ffebee', padding: '20px', borderRadius: '8px'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
