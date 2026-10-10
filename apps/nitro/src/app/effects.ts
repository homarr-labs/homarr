import type { ClientEffect, RefreshPorts } from "../contracts/refresh";
import { isSessionTransitionCurrent, runSessionTransition } from "./session-transition";

export async function applyClientEffect(ports: RefreshPorts, effect: ClientEffect): Promise<void> {
  switch (effect.kind) {
    case "query-refresh":
      await ports.queryClient.invalidateQueries(effect.filters);
      return;
    case "loader-refresh":
      await ports.invalidateLoaders();
      return;
    case "render-revision":
      await ports.refreshRenderSnapshot(effect.revision);
      return;
    case "session-change":
      await runSessionTransition(ports.queryClient, async () => {
        await ports.queryClient.cancelQueries();
        ports.queryClient.clear();
        await ports.resolveSession();
        await ports.invalidateLoaders();
      });
      return;
    case "resource-policy-change":
      if (!isSessionTransitionCurrent(ports.queryClient, effect.capturedEpoch)) return;
      await runSessionTransition(ports.queryClient, async () => {
        await ports.queryClient.cancelQueries();
        ports.queryClient.clear();
        await ports.invalidateResourcePolicy(effect.resource);
        await ports.invalidateLoaders();
      });
  }
}
