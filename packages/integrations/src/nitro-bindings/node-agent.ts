import type { Agent } from "node:http";
import type { Duplex } from "node:stream";

import { IntegrationBindingError } from "./errors";

export const ownIntegrationNodeAgent = (agent: Agent) => {
  const createConnection = agent.createConnection.bind(agent);
  const destroyAgent = agent.destroy.bind(agent);
  const connections = new Map<Duplex, Promise<void>>();
  const connecting = new Set<Promise<void>>();
  const failures: unknown[] = [];
  let retired = false;
  let retirement: Promise<void> | undefined;

  const destroy = (stream: Duplex) => {
    try {
      stream.destroy();
    } catch (error) {
      failures.push(error);
    }
  };

  const track = (stream: Duplex) => {
    if (!stream.closed && !connections.has(stream)) {
      connections.set(
        stream,
        new Promise<void>((resolve) =>
          stream.once("close", () => {
            connections.delete(stream);
            resolve();
          }),
        ),
      );
    }
    if (retired) destroy(stream);
  };

  agent.createConnection = (options, callback) => {
    if (retired) throw new IntegrationBindingError("closed");
    let complete: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      complete = resolve;
    });
    connecting.add(pending);
    const finish = () => {
      connecting.delete(pending);
      complete();
    };
    try {
      const stream = createConnection(options, (error, delivered) => {
        if (delivered) track(delivered);
        finish();
        callback?.(error, delivered);
      });
      if (stream) {
        track(stream);
        finish();
      }
      return stream;
    } catch (error) {
      finish();
      throw error;
    }
  };

  return {
    retireAsync() {
      if (!retirement) {
        retired = true;
        for (const stream of connections.keys()) destroy(stream);
        try {
          destroyAgent();
        } catch (error) {
          failures.push(error);
        }
        retirement = (async () => {
          while (connecting.size || connections.size) {
            await Promise.allSettled([...connecting, ...connections.values()]);
          }
          if (failures.length) throw new AggregateError(failures, "Integration native agent retirement failed");
        })();
      }
      return retirement;
    },
  };
};
