import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { NavigationRouter } from "./owner";
import { waitForNavigationScope } from "./scope";

export function useNavigationIntent() {
  const router = useRouter<NavigationRouter>();
  const mountedRouter = useRef<NavigationRouter | null>(null);
  const currentIntent = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    const intent = currentIntent.current;
    currentIntent.current = null;
    intent?.abort(new DOMException("Navigation intent ended", "AbortError"));
  }, []);

  useEffect(() => {
    mountedRouter.current = router;
    const unsubscribeBeforeNavigate = router.subscribe("onBeforeNavigate", close);
    const unsubscribeResolved = router.subscribe("onResolved", close);

    return () => {
      mountedRouter.current = null;
      unsubscribeBeforeNavigate();
      unsubscribeResolved();
      close();
    };
  }, [router, close]);

  const open = useCallback(() => {
    if (mountedRouter.current !== router) {
      throw new Error("Navigation intents require a mounted Router scope");
    }

    close();
    const intent = new AbortController();
    currentIntent.current = intent;
    return intent.signal;
  }, [router, close]);

  const run = useCallback(
    async <T>(start: () => Promise<T>): Promise<T> => {
      const signal = open();

      try {
        const value = await waitForNavigationScope(signal, start);
        signal.throwIfAborted();
        return value;
      } finally {
        if (currentIntent.current?.signal === signal) close();
      }
    },
    [open, close],
  );

  return useMemo(() => ({ open, close, run }), [open, close, run]);
}
