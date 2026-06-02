"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/app/lib/analytics";

interface ErrorBoundaryProps {
  children: ReactNode;
  sessionId?: string;
  componentName?: string;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — generic React error boundary that catches JavaScript errors
 * in its child tree and displays a fallback UI.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName: this.props.componentName,
      sessionId: this.props.sessionId,
    });

    reportError(error, {
      componentName: this.props.componentName,
      sessionId: this.props.sessionId,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl bg-white/90 p-8 text-center shadow-xl backdrop-blur-sm"
          role="alert"
        >
          <span className="text-4xl" aria-hidden="true">⚠️</span>
          <h2 className="text-xl font-semibold text-[#023047]">
            Something went wrong
          </h2>
          {this.props.sessionId && (
            <p className="text-sm text-[#023047]/60">
              Session: {this.props.sessionId}
            </p>
          )}
          <button
            onClick={this.handleReload}
            className="rounded-xl bg-[#FFB703] px-6 py-3 text-sm font-semibold text-[#023047] transition-colors hover:bg-[#FB8500] active:bg-[#FB8500] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
