import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  recovering: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      recovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error.message, info.componentStack);
  }

  handleRecoverAndClearCache = async () => {
    this.setState({ recovering: true });
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
      }
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update().catch(() => undefined)));
      }
    } catch {
      // Proceed cleanly to reload even if cache API is restricted
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isRtl =
      typeof document !== 'undefined' && document.documentElement.dir !== 'ltr';

    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-lg font-extrabold">
            {isRtl ? 'حدث تعثر مؤقت في الواجهة' : 'Temporary Display Recovery'}
          </h1>
          <p className="mb-5 text-xs leading-relaxed text-slate-400">
            {isRtl
              ? 'تم إيقاف الخطأ تلقائياً لحماية بياناتك. اضغط بالأسفل لتنظيف الذاكرة المؤقتة واستعادة المتجر فوراً.'
              : 'The app safely caught an unexpected error. Tap below to clear stale cache and restore smoothly.'}
          </p>
          <button
            type="button"
            disabled={this.state.recovering}
            onClick={this.handleRecoverAndClearCache}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            <span>
              {this.state.recovering
                ? isRtl
                  ? 'جاري تنظيف الذاكرة وإعادة التشغيل...'
                  : 'Cleaning cache & recovering...'
                : isRtl
                  ? 'إصلاح تلقائي وإعادة التحميل'
                  : 'Auto-Recover & Reload'}
            </span>
          </button>
        </div>
      </div>
    );
  }
}
