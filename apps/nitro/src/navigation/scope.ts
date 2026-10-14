export async function waitForNavigationScope<T>(signal: AbortSignal, start: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();

  const value = await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };

    const onSuccess = (value: T) => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      resolve(value);
    };

    const onError = (error: unknown) => {
      signal.removeEventListener("abort", onAbort);
      reject(error);
    };

    signal.addEventListener("abort", onAbort, { once: true });

    try {
      start().then(onSuccess, onError);
    } catch (error: unknown) {
      onError(error);
    }
  });

  signal.throwIfAborted();
  return value;
}
