import { useEffect, useState } from "react";

import { useBoardTabs } from "@homarr/boards/tabs";

export const useVisitedBoardTabs = () => {
  const { activeTab } = useBoardTabs();
  const activeTabId = activeTab?.id;
  const [preparedIds, setPreparedIds] = useState(() => new Set(activeTabId ? [activeTabId] : []));

  useEffect(() => {
    if (!activeTabId) return;
    setPreparedIds((previous) => {
      if (previous.has(activeTabId)) return previous;
      return new Set(previous).add(activeTabId);
    });
  }, [activeTabId]);

  return preparedIds;
};
