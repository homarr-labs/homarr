export const createRetryableLoader = <TKey, TValue>(loaders: ReadonlyMap<TKey, () => Promise<TValue>>) => {
  const promises = new Map<TKey, Promise<TValue>>();

  return (key: TKey) => {
    const existing = promises.get(key);
    if (existing) return existing;

    const loader = loaders.get(key);
    if (!loader) throw new Error(`No loader is registered for ${String(key)}`);

    const promise = loader();
    promises.set(key, promise);
    void promise.catch(() => {
      if (promises.get(key) === promise) promises.delete(key);
    });
    return promise;
  };
};
