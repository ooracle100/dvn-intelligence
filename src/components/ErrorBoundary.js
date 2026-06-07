import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 DVN Intelligence: Caught in ErrorBoundary:", error, errorInfo);
    if (process.env.NODE_ENV === 'production') {
      console.error("🚨 [Production] React ErrorBoundary caught an issue:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'white', backgroundColor: '#1e1e1e', minHeight: '100vh' }}>
          <h2>Something went wrong.</h2>
          <p style={{ color: '#ff6b6b' }}>{this.state.error && this.state.error.toString()}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
