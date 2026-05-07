'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title: string;
  message: string;
  retryLabel: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Tool section crashed:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="backdrop-blur-sm bg-red-950/30 border border-red-500/30 rounded-xl p-6 text-center">
          <h3 className="text-red-200 font-semibold mb-2">{this.props.title}</h3>
          <p className="text-red-100/80 text-sm mb-4">{this.props.message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-100 rounded-lg text-sm font-medium transition-colors"
          >
            {this.props.retryLabel}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
