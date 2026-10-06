"use client";
import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          className="flex flex-col items-center justify-center h-full p-8 text-center"
          style={{ background: "var(--bg-base)", color: "white" }}
        >
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Something went wrong.
          </h1>
          <p className="text-gray-400 mb-6">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 font-semibold rounded-lg"
            style={{ background: "var(--green)", color: "#0f0f0f" }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}