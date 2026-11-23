import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#070B19] p-6 text-slate-100">
          <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/95 p-6">
            <h2 className="font-display text-xl font-bold text-rose-400">Sync Error</h2>
            <p className="mt-2 text-sm text-slate-300 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 transition-colors"
            >
              Reload Game
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
