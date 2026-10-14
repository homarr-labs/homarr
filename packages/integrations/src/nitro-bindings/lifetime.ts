import { IntegrationBindingError } from "./errors";

export const createIntegrationBindingLifetime = () => {
  const controller = new AbortController();
  const pending = new Set<Promise<unknown>>();
  const releases = new Set<() => Promise<void>>();
  const failures: unknown[] = [];
  let closed = false;
  let closing: Promise<void> | undefined;

  const assertOpen = () => {
    if (closed) throw new IntegrationBindingError("closed");
  };

  const trackAsync = <T>(operation: () => Promise<T>): Promise<T> => {
    assertOpen();
    const work = Promise.resolve().then(() => {
      assertOpen();
      return operation();
    });
    pending.add(work);
    void work.then(
      () => pending.delete(work),
      () => pending.delete(work),
    );
    return work;
  };

  const own = (release: () => Promise<void>) => {
    let completion: Promise<void> | undefined;
    const releaseAsync = () => {
      if (!completion) {
        completion = Promise.resolve().then(release);
        void completion.then(
          () => releases.delete(releaseAsync),
          (error: unknown) => {
            releases.delete(releaseAsync);
            failures.push(error);
          },
        );
      }
      return completion;
    };
    releases.add(releaseAsync);
    if (closed) void releaseAsync().catch(() => {});
    return releaseAsync;
  };

  return {
    signal: controller.signal,
    assertOpen,
    trackAsync,
    own,
    get pendingCount() {
      return pending.size;
    },
    get leaseCount() {
      return releases.size;
    },
    closeAsync() {
      if (!closing) {
        closed = true;
        controller.abort(new IntegrationBindingError("closed"));
        closing = (async () => {
          while (pending.size) await Promise.allSettled([...pending]);
          while (releases.size) await Promise.allSettled([...releases].map((release) => release()));
          if (failures.length) throw new AggregateError(failures, "Integration binding release failed");
        })();
      }
      return closing;
    },
  };
};

export type IntegrationBindingLifetime = ReturnType<typeof createIntegrationBindingLifetime>;
