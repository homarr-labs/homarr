import type { DockerFeatureClient, DockerLogInput, DockerLogIterator } from "./client";

export type DockerLogState =
  | { kind: "connecting" }
  | { kind: "streaming" }
  | { kind: "ended" }
  | { kind: "stopping" }
  | { kind: "stopped" }
  | { kind: "error"; error: unknown };

export function createDockerLogSession(
  client: DockerFeatureClient,
  input: DockerLogInput,
  callbacks: {
    onChunk: (chunk: string) => void;
    onState: (state: DockerLogState) => void;
  },
) {
  const controller = new AbortController();
  let iterator: DockerLogIterator | undefined;
  let returning: Promise<void> | undefined;
  let stopping = false;
  let settled = false;
  const release = () => {
    if (returning || !iterator) return returning;
    const current = iterator;
    returning = Promise.resolve().then(async () => {
      const result = await current.return();
      if (!result.done) throw new Error("Docker log iterator did not acknowledge return");
    });
    return returning;
  };
  callbacks.onState({ kind: "connecting" });
  const finished = (async () => {
    let outcome: DockerLogState = { kind: "ended" };
    try {
      iterator = await client.docker.subscribeLogs(input, { signal: controller.signal });
      if (!stopping) {
        callbacks.onState({ kind: "streaming" });
        while (!controller.signal.aborted) {
          const result = await iterator.next();
          if (stopping || result.done) break;
          callbacks.onChunk(result.value);
        }
      }
    } catch (error) {
      if (!stopping) outcome = { kind: "error", error };
    } finally {
      try {
        await release();
        if (stopping) outcome = { kind: "stopped" };
      } catch (error) {
        outcome = { kind: "error", error };
      }
      settled = true;
      callbacks.onState(outcome);
    }
  })();
  return {
    finished,
    stop() {
      if (settled) return finished;
      if (!stopping) {
        stopping = true;
        callbacks.onState({ kind: "stopping" });
        controller.abort();
        void release()?.catch(() => undefined);
      }
      return finished;
    },
  };
}
