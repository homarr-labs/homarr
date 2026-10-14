export type {
  SerializedCacheWriteOptions,
  SerializedStringCache,
  SerializedStringCacheOwner,
} from "@homarr/redis/cache";

export type SerializedCacheOperation = "get" | "set" | "remove";

export class SerializedCacheTimeoutError extends Error {
  constructor(
    readonly operation: SerializedCacheOperation,
    readonly nativeWorkStarted: boolean,
  ) {
    super("Serialized cache operation exceeded its caller deadline");
    this.name = "SerializedCacheTimeoutError";
  }
}
