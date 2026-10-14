import { createJobStatusRuntime } from "../runtime";
import type { JobStatusRecord } from "../runtime";
import { createJobStatusStateBacking } from "./backing";
import type { JobStatusStateBackingOptions } from "./contracts";

export interface JobStatusStateConsumerOptions extends JobStatusStateBackingOptions {
  ownerId: string;
  now(): Date;
  createRunId(): string;
}

export const createJobStatusStateConsumer = (options: JobStatusStateConsumerOptions) => {
  const { hostLifetime } = options;
  const resource = createJobStatusStateBacking(options);
  const runtime = createJobStatusRuntime({
    backing: resource.backing,
    ownerId: options.ownerId,
    now: options.now,
    createRunId: options.createRunId,
  });
  let disposal: Promise<void> | undefined;

  return {
    getAsync: runtime.getAsync,
    repairInterruptedAsync: runtime.repairInterruptedAsync,
    beginAsync: runtime.beginAsync,
    finishAsync: runtime.finishAsync,
    subscribeAsync: (
      names: readonly string[],
      listener: (record: JobStatusRecord) => Promise<void>,
      onError: (error: unknown) => void,
    ) =>
      runtime.subscribeAsync(
        names,
        async (record) => {
          hostLifetime.throwIfAborted();
          await listener(record);
          hostLifetime.throwIfAborted();
        },
        onError,
      ),
    disposeAsync: (): Promise<void> => {
      if (disposal) return disposal;
      disposal = (async () => {
        const results = await Promise.allSettled([runtime.disposeAsync(), resource.disposeAsync()]);
        const failures: unknown[] = [];
        for (const result of results) if (result.status === "rejected") failures.push(result.reason);
        if (failures.length > 0) throw new AggregateError(failures, "Cron job status consumer cleanup failed");
      })();
      return disposal;
    },
  };
};
