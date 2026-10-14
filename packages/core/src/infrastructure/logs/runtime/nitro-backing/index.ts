import { LOG_HISTORY_KEY, LOG_HISTORY_MAX_ENTRIES } from "../../constants";
import type { HistoryOperation, LogHistoryBacking, SampleHistoryBacking } from "../backing";
import type {
  HistoryBackingLimits,
  HistoryBackingStatus,
  HistorySqlOperation,
  HistorySqlStore,
  SampleHistoryRegistration,
} from "./contracts";
import type { RegisteredHistoryStream } from "./queue";
import { HistoryOperationQueue } from "./queue";

export type {
  HistoryBackingLimits,
  HistoryBackingStatus,
  HistoryBackingUsage,
  HistorySqlOperation,
  HistorySqlStore,
  HistorySqlStream,
  SampleHistoryRegistration,
} from "./contracts";
export { HistoryAdmissionError, HistoryBackingClosedError, HistoryDeadlineError } from "./contracts";
export { bindNitroSampleHistoryResources, createNitroLogHistoryStream } from "./consumers";

export interface NitroHistoryBacking {
  readonly logs: LogHistoryBacking;
  readonly samples: SampleHistoryBacking;
  readonly signal: AbortSignal;
  status(): HistoryBackingStatus;
  closeAsync(): Promise<void>;
}

export const createNitroHistoryBacking = (options: {
  store: HistorySqlStore;
  lifetime: AbortSignal;
  limits: HistoryBackingLimits;
  samples: readonly SampleHistoryRegistration[];
}): NitroHistoryBacking => {
  const queue = new HistoryOperationQueue(options.lifetime, options.limits);
  let logs: RegisteredHistoryStream;
  const samples = new Map<string, RegisteredHistoryStream>();
  const store = options.store;
  try {
    logs = queue.register({ kind: "log", name: LOG_HISTORY_KEY }, LOG_HISTORY_MAX_ENTRIES);
    for (const registration of options.samples) {
      if (samples.has(registration.name)) throw new TypeError("Duplicate sample history registration");
      if (registration.maxEntries !== 15 && registration.maxEntries !== 100) {
        throw new RangeError("Unsupported source sample retention");
      }
      samples.set(
        registration.name,
        queue.register({ kind: "sample", name: registration.name }, registration.maxEntries),
      );
    }
  } catch (error) {
    void queue.closeAsync();
    throw error;
  }

  const sample = (name: string) => {
    const stream = samples.get(name);
    if (!stream) throw new TypeError("Unregistered sample history stream");
    return stream;
  };
  const checkRetention = (stream: RegisteredHistoryStream, maxEntries: number, append: boolean) => {
    if (
      !Number.isSafeInteger(maxEntries) ||
      maxEntries < 1 ||
      maxEntries > stream.maxEntries ||
      (append && maxEntries !== stream.maxEntries)
    ) {
      throw new RangeError("History bound does not match the registered source retention");
    }
  };
  const appendAsync = async (stream: RegisteredHistoryStream, payload: string, operation: HistorySqlOperation) => {
    queue.checkOperation(operation);
    const result = await store.appendTrimAsync(stream.identity, payload, stream.maxEntries, operation);
    queue.checkOperation(operation);
    if (
      result.payload !== payload ||
      typeof result.sequence !== "string" ||
      !/^[1-9][0-9]{0,18}$/.test(result.sequence)
    ) {
      throw new TypeError("Invalid committed history record");
    }
    const sequence = BigInt(result.sequence);
    if (sequence > 9_223_372_036_854_775_807n || sequence <= stream.lastSequence) {
      throw new RangeError("History sequence overflow or regression");
    }
    stream.lastSequence = sequence;
    return result.payload;
  };
  const readAsync = async (stream: RegisteredHistoryStream, maxEntries: number, operation: HistoryOperation) => {
    checkRetention(stream, maxEntries, false);
    return await queue.runAsync(stream, queue.snapshotReservationBytes(), operation.signal, async (sqlOperation) => {
      queue.checkOperation(sqlOperation);
      const entries = await store.readNewestAsync(stream.identity, maxEntries, sqlOperation);
      queue.checkOperation(sqlOperation);
      return queue.snapshot(entries, maxEntries);
    });
  };

  const logBacking: LogHistoryBacking = {
    appendAndPublishAsync: async (message, maxEntries, operation) => {
      checkRetention(logs, maxEntries, true);
      await queue.runAsync(logs, queue.payloadBytes(message), operation.signal, async (sqlOperation) => {
        const committed = await appendAsync(logs, message, sqlOperation);
        queue.publish(logs, committed, sqlOperation);
      });
    },
    readNewestAsync: async (maxEntries, operation) => await readAsync(logs, maxEntries, operation),
    subscribeAsync: async (callback, operation) => queue.subscribe(logs, callback, operation.signal),
  };
  const sampleBacking: SampleHistoryBacking = {
    pushAsync: async (name, entry, maxEntries, operation) => {
      const stream = sample(name);
      checkRetention(stream, maxEntries, true);
      await queue.runAsync(stream, queue.payloadBytes(entry), operation.signal, async (sqlOperation) => {
        await appendAsync(stream, entry, sqlOperation);
      });
    },
    readNewestAsync: async (name, maxEntries, operation) => await readAsync(sample(name), maxEntries, operation),
    clearAsync: async (name, operation) => {
      const stream = sample(name);
      await queue.runAsync(stream, 0, operation.signal, async (sqlOperation) => {
        queue.checkOperation(sqlOperation);
        await store.clearAsync(stream.identity, sqlOperation);
        queue.checkOperation(sqlOperation);
      });
    },
    publishAsync: async (name, data, operation) => {
      const stream = sample(name);
      await queue.runAsync(stream, queue.payloadBytes(data), operation.signal, async (sqlOperation) => {
        queue.publish(stream, data, sqlOperation);
      });
    },
    subscribeAsync: async (name, callback, operation) => queue.subscribe(sample(name), callback, operation.signal),
  };
  return {
    logs: logBacking,
    samples: sampleBacking,
    signal: queue.signal,
    status: () => queue.status(),
    closeAsync: () => queue.closeAsync(),
  };
};
