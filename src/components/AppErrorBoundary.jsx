import { Component } from "react";

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Silo failed to start", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRecovery = () => {
    window.location.hash = "";
    window.location.reload();
  };

  handleCopy = async () => {
    const text = this.state.error?.stack || String(this.state.error);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="silo-error-boundary">
        <div className="silo-error-boundary__card silo-glass">
          <div className="silo-error-boundary__icon" aria-hidden>
            S
          </div>
          <h1>Silo could not start</h1>
          <p>
            Your private files are still on this device. Try reloading, clearing the app cache, or opening recovery.
          </p>
          <div className="silo-error-boundary__actions">
            <button type="button" className="silo-btn silo-btn--primary" onClick={this.handleReload}>
              Reload app
            </button>
            <button type="button" className="silo-btn silo-btn--secondary" onClick={this.handleRecovery}>
              Open recovery
            </button>
            <button type="button" className="silo-btn silo-btn--ghost" onClick={this.handleCopy}>
              Copy error
            </button>
          </div>
        </div>
      </div>
    );
  }
}
