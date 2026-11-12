import React from "react";

export default class ErrorBoundary extends React.Component {
  state = { failed: false, errorMessage: "" };

  static getDerivedStateFromError(error) {
    return {
      failed: true,
      errorMessage: error?.message || "Unknown render error",
    };
  }

  componentDidCatch(error, info) {
    console.error("[Oralyn Desktop] Unhandled render error", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const showDiagnostics = import.meta.env?.VITE_SHOW_DIAGNOSTICS === "true";
    return (
      <main className="error-screen" role="alert">
        <section className="error-card">
          <span className="eyebrow">ORALYN · SECURE WORKSPACE</span>
          <h1>We could not open this workspace.</h1>
          <p>Your session and clinic records have not been deleted. Reload the application to try again.</p>
          {showDiagnostics && (
            <details className="diagnostic-details">
              <summary>Staging diagnostic details</summary>
              <pre>{this.state.errorMessage}</pre>
            </details>
          )}
          <button className="primary" onClick={() => window.location.reload()}>Reload workspace</button>
        </section>
      </main>
    );
  }
}
