import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#E7E3DA] rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-serif font-bold text-[#1C1917] mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#78716C] mb-6">
              We encountered a temporary display issue. Please refresh the page to continue shopping.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#1C1917] text-white rounded-xl text-sm font-semibold hover:bg-[#292524] transition-colors cursor-pointer"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
