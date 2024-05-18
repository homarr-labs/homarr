import { objectEntries, objectKeys } from "@homarr/common";
import type { MaybePromise } from "@homarr/common/types";
import { queueChannel } from "@homarr/redis";
import type { z } from "@homarr/validation";

import type { createQueue } from "./creator";

interface Queue<TInput extends z.ZodType = z.ZodType> {
  name: string;
  callback: (input: z.infer<TInput>) => MaybePromise<void>;
  inputValidator: TInput;
}

type Queues = Record<
  string,
  ReturnType<ReturnType<typeof createQueue>["withCallback"]>
>;

export const createQueueClient = <TQueues extends Queues>(queues: TQueues) => {
  const queueRegistry = new Map<string, Queue>();
  for (const [name, queue] of objectEntries(queues)) {
    if (typeof name !== "string") continue;
    queueRegistry.set(name, {
      name,
      callback: queue._callback,
      inputValidator: queue._input,
    });
  }

  return {
    queueRegistry,
    client: objectKeys(queues).reduce(
      (acc, name) => {
        acc[name] = async (
          data: z.infer<TQueues[typeof name]["_input"]>,
          options,
        ) => {
          if (typeof name !== "string") return;
          const queue = queueRegistry.get(name);
          if (!queue) return;

          await queueChannel.addAsync({
            name,
            data,
            executionDate:
              typeof options === "object" && options.executionDate
                ? options.executionDate
                : new Date(),
          });
        };
        return acc;
      },
      {} as Record<
        keyof TQueues,
        (
          data: z.infer<TQueues[keyof TQueues]["_input"]>,
          props: {
            executionDate?: Date;
          } | void,
        ) => Promise<void>
      >,
    ),
  };
};
