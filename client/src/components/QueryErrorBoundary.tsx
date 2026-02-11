import React from "react";

type QueryErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type QueryErrorBoundaryState = {
  hasError: boolean;
};

export default class QueryErrorBoundary extends React.Component<
  QueryErrorBoundaryProps,
  QueryErrorBoundaryState
> {
  state: QueryErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("QueryErrorBoundary caught an error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
