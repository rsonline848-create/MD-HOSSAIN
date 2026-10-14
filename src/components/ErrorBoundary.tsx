import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  private handleClearAndRecover = () => {
    if (confirm('আপনি কি অ্যাপের ক্যাশ ক্লিয়ার করে রিস্টার্ট করতে চান?')) {
      window.location.reload();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">সাময়িক ত্রুটি হয়েছে</h2>
              <p className="text-xs text-slate-400">
                ডাটা রেন্ডার করার সময় একটি অসঙ্গতি দেখা দিয়েছে। নিচে রিস্টার্ট বাটনে চাপ দিন।
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-900/80 p-3 rounded-xl text-left font-mono text-[11px] text-rose-300 max-h-28 overflow-y-auto border border-rose-500/20">
                {this.state.error.message || 'Unknown render error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পেজ রিলোড করুন</span>
              </button>

              <button
                onClick={this.handleClearAndRecover}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>হোমে ফিরে যান</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
