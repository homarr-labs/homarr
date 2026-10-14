export interface SerializedCacheWriteOptions {
  ttlMs?: number;
  ttlSeconds?: number;
}

export interface SerializedStringCache {
  getAsync(key: string): Promise<string | null>;
  setAsync(key: string, value: string, options?: SerializedCacheWriteOptions): Promise<void>;
  removeAsync(key: string): Promise<void>;
}

export interface SerializedStringCacheOwner extends SerializedStringCache {
  stopAsync(): Promise<void>;
}
