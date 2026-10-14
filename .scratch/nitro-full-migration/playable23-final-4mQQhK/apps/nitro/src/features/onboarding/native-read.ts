import { useEffect, useState } from "react";

export type OnboardingRead<Value> =
  | { kind: "disabled" }
  | { kind: "loading" }
  | { kind: "ready"; data: Value }
  | { kind: "error"; error: unknown };

export function useOnboardingRead<Value>(read: (signal: AbortSignal) => Promise<Value>, enabled = true) {
  const [state, setState] = useState<OnboardingRead<Value>>({ kind: enabled ? "loading" : "disabled" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ kind: "disabled" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    void read(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ kind: "ready", data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ kind: "error", error });
      },
    );
    return () => controller.abort();
  }, [read, enabled, attempt]);

  return { state, retry: () => setAttempt((value) => value + 1) };
}
