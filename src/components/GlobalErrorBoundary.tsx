import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-slate-950 text-white min-h-screen flex flex-col justify-center items-center font-mono text-xs">
          <div className="max-w-2xl w-full border border-red-500/30 bg-red-950/20 p-6 rounded-xl space-y-4">
            <h1 className="text-red-500 font-bold text-sm">React Application Runtime Crash</h1>
            <p className="font-semibold text-slate-300">{this.state.error?.toString()}</p>
            <pre className="text-[10px] text-slate-450 bg-black/60 p-4 rounded overflow-auto max-h-60 leading-relaxed whitespace-pre-wrap">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-all"
            >
              Clear Storage & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default GlobalErrorBoundary;
