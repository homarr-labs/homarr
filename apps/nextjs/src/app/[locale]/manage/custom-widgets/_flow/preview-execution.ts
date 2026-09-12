import { useEffect, useState } from "react";
import { useWorkbenchSelection } from "./selection";

export function usePreviewExecution() {
  const selection = useWorkbenchSelection();
  const [activeTab, setActiveTab] = useState<string | null>("widget");
  const [revealVersion, setRevealVersion] = useState(0);
  const [focus, setFocus] = useState<{ selection: string | undefined; requestId?: string }>();
  let requestId: string | undefined;
  if (selection?.startsWith("request:") || selection?.startsWith("native:"))
    requestId = selection.slice(selection.indexOf(":") + 1);
  if (focus?.selection === selection) requestId = focus?.requestId;
  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: unknown; panel?: unknown }>).detail;
      if (typeof detail?.requestId !== "string" || !["data", "journal"].includes(String(detail.panel))) return;
      setFocus({ selection, requestId: detail.requestId });
      setActiveTab(String(detail.panel));
      setRevealVersion((value) => value + 1);
    };
    window.addEventListener("homarr:widget-execution-panel", show);
    return () => window.removeEventListener("homarr:widget-execution-panel", show);
  }, [selection]);
  return { activeTab, setActiveTab, requestId, revealVersion, showAll: () => setFocus({ selection }) };
}
