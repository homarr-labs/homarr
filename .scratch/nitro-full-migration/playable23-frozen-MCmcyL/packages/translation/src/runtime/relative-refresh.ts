import type { CultureClock } from "./culture";

export interface RelativeRefreshScheduler<Handle> {
  setInterval(callback: () => void, milliseconds: number): Handle;
  clearInterval(handle: Handle): void;
}

export function observeTimeAgo<Handle>(
  timestamp: Date,
  resources: {
    calculateTimeAgo(timestamp: Date): string;
    scheduler: RelativeRefreshScheduler<Handle>;
    publish(value: string): void;
  },
  updateFrequency = 1000,
): () => void {
  let active = true;
  const refresh = () => {
    if (active) resources.publish(resources.calculateTimeAgo(timestamp));
  };
  refresh();
  const interval = resources.scheduler.setInterval(refresh, updateFrequency);
  return () => {
    if (!active) return;
    active = false;
    resources.scheduler.clearInterval(interval);
  };
}

export function getIntegrationConnectionState(updatedAt: Date, clock: CultureClock, timeout = 30000) {
  const difference = clock.now() - updatedAt.getTime();
  return { connected: Math.abs(difference) < timeout, delayUntilTimeout: timeout - Math.abs(difference) };
}
