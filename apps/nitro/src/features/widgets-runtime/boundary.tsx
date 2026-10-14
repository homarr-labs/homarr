import { Component } from "react";
import type { ReactNode } from "react";

interface WidgetBoundaryProps {
  children: ReactNode;
  fallback: (error: unknown, reset: () => void) => ReactNode;
  onReset: () => Promise<void>;
}

type WidgetBoundaryState = { kind: "ready" } | { kind: "failed"; error: unknown };

export class WidgetBoundary extends Component<WidgetBoundaryProps, WidgetBoundaryState> {
  state: WidgetBoundaryState = { kind: "ready" };
  private mounted = false;
  private pendingReset: Promise<void> | null = null;

  static getDerivedStateFromError(error: unknown): WidgetBoundaryState {
    return { kind: "failed", error };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
    this.pendingReset = null;
  }

  reset = () => {
    if (!this.mounted || this.pendingReset || this.state.kind !== "failed") return;
    const pendingReset: Promise<void> = Promise.resolve().then(() => {
      if (!this.mounted || this.pendingReset !== pendingReset) return;
      return this.props.onReset();
    });
    this.pendingReset = pendingReset;
    void pendingReset.then(
      () => {
        if (!this.mounted || this.pendingReset !== pendingReset) return;
        this.setState({ kind: "ready" }, () => {
          if (this.pendingReset === pendingReset) this.pendingReset = null;
        });
      },
      (error: unknown) => {
        if (!this.mounted || this.pendingReset !== pendingReset) return;
        this.setState({ kind: "failed", error }, () => {
          if (this.pendingReset === pendingReset) this.pendingReset = null;
        });
      },
    );
  };

  render() {
    return this.state.kind === "failed" ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
