// ioredis command timeouts and a single wall-clock timer both reject from the
// timers phase, before a reply already sitting in the socket is read. That
// looks like a Redis failure when the container was only off CPU. Count short
// slices of time the loop was actually turning, then let the poll phase
// deliver a buffered reply before giving up.
export const redisOperationTimeoutSliceMs = 50;

export const withRedisOperationTimeoutAsync = async <T>(
  promise: Promise<T>,
  durationMs: number,
  timeoutMessage = "Redis operation timed out",
): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    let elapsedMs = 0;
    let lastMark = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timeoutCheck: ReturnType<typeof setImmediate> | undefined;

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (timeoutCheck) clearImmediate(timeoutCheck);
      settle();
    };

    const tick = () => {
      if (settled) return;
      const currentTime = performance.now();
      const gapMs = currentTime - lastMark;
      lastMark = currentTime;
      // A gap larger than one slice is a stall or a throttle period, not time
      // Redis spent on this command.
      elapsedMs += Math.min(gapMs, redisOperationTimeoutSliceMs);
      if (elapsedMs < durationMs) {
        timer = setTimeout(tick, redisOperationTimeoutSliceMs);
        return;
      }

      timeoutCheck = setImmediate(() => {
        finish(() => reject(new Error(timeoutMessage)));
      });
    };

    // Referenced on purpose. An unref'd timer does not wake the loop, so a
    // silent Redis connection would wait forever.
    timer = setTimeout(tick, redisOperationTimeoutSliceMs);
    void promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
};
