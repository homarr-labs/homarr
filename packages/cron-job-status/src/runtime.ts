export interface RuntimeTaskStatus {
  name: string;
  status: "running" | "idle";
  lastExecutionTimestamp: string;
  lastExecutionStatus: "success" | "error" | null;
}

export interface JobStatusRecord {
  revision: number;
  ownerId: string;
  runId: string;
  value: RuntimeTaskStatus;
}

export interface JobStatusBacking {
  getAsync(name: string): Promise<JobStatusRecord | null>;
  updateAsync(
    name: string,
    update: (previous: JobStatusRecord | null) => Omit<JobStatusRecord, "revision"> | null,
  ): Promise<JobStatusRecord | null>;
  subscribeAsync(names: readonly string[], listener: (record: JobStatusRecord) => void): Promise<() => Promise<void>>;
}

export interface JobStatusRuntimeOptions {
  backing: JobStatusBacking;
  ownerId: string;
  now(): Date;
  createRunId(): string;
}

export const createJobStatusRuntime = (options: JobStatusRuntimeOptions) => {
  const subscriptions = new Set<() => Promise<void>>();
  const cleanupFailures = new Set<unknown>();
  let closed = false;
  let shutdown: Promise<void> | undefined;

  const assertOpen = () => {
    if (closed) throw new Error("Cron job status is closed");
  };

  return {
    getAsync: async (name: string) => {
      assertOpen();
      return options.backing.getAsync(name);
    },
    repairInterruptedAsync: async (names: readonly string[]) => {
      assertOpen();
      for (const name of names) {
        await options.backing.updateAsync(name, (previous) => {
          if (!previous || previous.value.status !== "running" || previous.ownerId === options.ownerId) return null;
          return {
            ...previous,
            ownerId: options.ownerId,
            value: { ...previous.value, status: "idle", lastExecutionStatus: "error" },
          };
        });
      }
    },
    beginAsync: async (name: string) => {
      assertOpen();
      const runId = options.createRunId();
      const timestamp = options.now().toISOString();
      const record = await options.backing.updateAsync(name, (previous) => ({
        ownerId: options.ownerId,
        runId,
        value: {
          name,
          status: "running",
          lastExecutionTimestamp: timestamp,
          lastExecutionStatus: previous?.value.lastExecutionStatus ?? null,
        },
      }));
      if (!record) throw new Error("Cron job running status was not recorded");
      return runId;
    },
    finishAsync: async (name: string, runId: string, result: "success" | "error") => {
      assertOpen();
      await options.backing.updateAsync(name, (previous) => {
        if (!previous || previous.ownerId !== options.ownerId || previous.runId !== runId) return null;
        return { ...previous, value: { ...previous.value, status: "idle", lastExecutionStatus: result } };
      });
    },
    subscribeAsync: async (
      names: readonly string[],
      listener: (record: JobStatusRecord) => Promise<void>,
      onError: (error: unknown) => void,
    ): Promise<() => Promise<void>> => {
      assertOpen();
      const allowedNames = new Set(names);
      const latest = new Map<string, JobStatusRecord>();
      const delivered = new Map<string, number>();
      let initializing = true;
      let disposed = false;
      let delivering = false;
      let delivery = Promise.resolve();
      let registration: Promise<() => Promise<void>> | undefined;
      const snapshotReads: Promise<JobStatusRecord | null>[] = [];
      let disposal: Promise<void> | undefined;

      const dispose = (): Promise<void> => {
        if (disposal) return disposal;
        disposed = true;
        latest.clear();
        disposal = (async () => {
          const unsubscribeAsync = async () => {
            const unsubscribe = await registration;
            await unsubscribe?.();
          };
          const [unsubscription, completion] = await Promise.allSettled([
            unsubscribeAsync(),
            delivery,
            ...snapshotReads,
          ]);
          const failures = [unsubscription, completion]
            .filter((result) => result?.status === "rejected")
            .map((result) => result.reason);
          if (failures.length === 1) throw failures[0];
          if (failures.length > 1) throw new AggregateError(failures, "Cron job status consumer cleanup failed");
        })().then(
          () => {
            subscriptions.delete(dispose);
          },
          (error: unknown) => {
            cleanupFailures.add(error);
            try {
              onError(error);
            } catch (reportingError) {
              cleanupFailures.add(reportingError);
            }
            throw error;
          },
        );
        return disposal;
      };

      const deliver = () => {
        if (delivering || disposed) return;
        delivering = true;
        delivery = Promise.resolve()
          .then(async () => {
            while (latest.size > 0) {
              if (disposed) return;
              const records = [...latest.values()];
              latest.clear();
              for (const record of records) {
                if (disposed) return;
                if (record.revision <= (delivered.get(record.value.name) ?? -1)) continue;
                delivered.set(record.value.name, record.revision);
                await listener(record);
              }
            }
          })
          .catch((error: unknown) => {
            disposed = true;
            latest.clear();
            try {
              onError(error);
            } finally {
              void dispose().catch((cleanupError: unknown) => {
                cleanupFailures.add(cleanupError);
              });
            }
          })
          .finally(() => {
            delivering = false;
            if (!disposed && latest.size > 0) deliver();
          });
      };

      const receive = (record: JobStatusRecord) => {
        if (disposed || !allowedNames.has(record.value.name)) return;
        const revision = Math.max(
          delivered.get(record.value.name) ?? -1,
          latest.get(record.value.name)?.revision ?? -1,
        );
        if (record.revision <= revision) return;
        latest.set(record.value.name, record);
        if (!initializing) deliver();
      };

      subscriptions.add(dispose);
      try {
        registration = options.backing.subscribeAsync([...allowedNames], receive);
        await registration;
        if (disposed || closed) {
          await dispose();
          return dispose;
        }
        for (const name of allowedNames) snapshotReads.push(options.backing.getAsync(name));
        for (const snapshot of await Promise.all(snapshotReads)) if (snapshot) receive(snapshot);
        initializing = false;
        deliver();
        return dispose;
      } catch (error) {
        try {
          await dispose();
        } catch (cleanupError) {
          cleanupFailures.add(cleanupError);
        }
        throw error;
      }
    },
    disposeAsync: (): Promise<void> => {
      if (shutdown) return shutdown;
      closed = true;
      shutdown = (async () => {
        const results = await Promise.allSettled([...subscriptions].map((dispose) => dispose()));
        const failures = new Set(cleanupFailures);
        for (const result of results) if (result.status === "rejected") failures.add(result.reason);
        if (failures.size > 0) throw new AggregateError([...failures], "Cron job status runtime cleanup failed");
      })();
      return shutdown;
    },
  };
};
