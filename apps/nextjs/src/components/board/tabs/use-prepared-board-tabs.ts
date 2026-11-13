import { startTransition, useEffect, useState } from "react";

import { useBoardTabs } from "@homarr/boards/tabs";

export const usePreparedBoardTabs = () => {
  const { tabs, activeTab } = useBoardTabs();
  const activeTabId = activeTab?.id;
  const [preparedIds, setPreparedIds] = useState(() => new Set(activeTabId ? [activeTabId] : []));

  useEffect(() => {
    if (!activeTabId) return;
    setPreparedIds((previous) => {
      if (previous.has(activeTabId)) return previous;
      return new Set(previous).add(activeTabId);
    });
  }, [activeTabId]);

  useEffect(() => {
    const nextTab = tabs.find((tab) => tab.id !== activeTabId && !preparedIds.has(tab.id));
    if (!nextTab) return;

    let frameId: number | undefined;
    let idleId: number | undefined;
    let cancelled = false;
    const prepare = () => {
      if (cancelled) return;
      startTransition(() => setPreparedIds((previous) => new Set(previous).add(nextTab.id)));
    };
    const timer = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(prepare, { timeout: 2_000 });
        else prepare();
      });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
    };
  }, [activeTabId, preparedIds, tabs]);

  return preparedIds;
};
