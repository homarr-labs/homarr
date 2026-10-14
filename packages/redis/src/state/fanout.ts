import { parse, stringify } from "superjson";

import type { StateSnapshotChannels } from "./channels";
import type { StateDiagnostics } from "./backing";

export const createStateFanout = (channels: StateSnapshotChannels, diagnostics: StateDiagnostics) => {
  const subscribers = new Map<string, Set<(message: string) => void>>();
  const disposals = new Set<() => void>();
  let stopped = false;

  const assertActive = () => {
    if (stopped) throw new Error("State fanout is stopped");
  };

  const createSubPubChannel = <TData>(name: string, { persist }: { persist: boolean } = { persist: true }) => {
    const latest = channels.createGetSetChannel<TData>(`pubSub:last:${name}`);
    const channelName = `pubSub:${name}`;
    return {
      subscribe: (callback: (data: TData) => void) => {
        assertActive();
        let active = true;
        let hydrating = persist;
        let pending: string | undefined;
        const deliver = (message: string) => {
          if (!active) return;
          if (hydrating) pending = message;
          else {
            try {
              callback(parse<TData>(message));
            } catch (error) {
              diagnostics.warn("State subscriber failed", { channelName }, error);
            }
          }
        };
        const listeners = subscribers.get(channelName) ?? new Set<(message: string) => void>();
        listeners.add(deliver);
        subscribers.set(channelName, listeners);
        const unsubscribe = () => {
          if (!active) return;
          active = false;
          pending = undefined;
          listeners.delete(deliver);
          if (listeners.size === 0 && subscribers.get(channelName) === listeners) subscribers.delete(channelName);
          disposals.delete(unsubscribe);
        };
        disposals.add(unsubscribe);
        const readyAsync = (async () => {
          if (!persist) return;
          try {
            const snapshot = await latest.getStateAsync();
            hydrating = false;
            if (!active) return;
            if (pending !== undefined) deliver(pending);
            else if (snapshot.kind === "value") deliver(stringify(snapshot.value));
          } catch (error) {
            unsubscribe();
            throw error;
          } finally {
            pending = undefined;
          }
        })();
        void readyAsync.catch((error: unknown) =>
          diagnostics.warn("State subscription snapshot failed", { channelName }, error),
        );
        return Object.assign(unsubscribe, { readyAsync });
      },
      publishAsync: async (data: TData) => {
        assertActive();
        const message = stringify(data);
        if (persist) await latest.setAsync(data);
        assertActive();
        for (const subscriber of subscribers.get(channelName) ?? []) subscriber(message);
      },
      getLastDataAsync: async () => {
        assertActive();
        return await latest.getAsync();
      },
    };
  };

  return {
    createSubPubChannel,
    stop: () => {
      stopped = true;
      for (const dispose of disposals) dispose();
      subscribers.clear();
    },
  };
};
