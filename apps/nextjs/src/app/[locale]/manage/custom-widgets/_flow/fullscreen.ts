import { useEffect, useRef, useState } from "react";

/** Fill the management area without remounting the editor; immersive mode also isolates the shell. */
export function useWorkbenchFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const workspace = ref.current;
    if (!workspace) return;
    const managementMain = workspace.closest("main");
    const previousFocus = document.activeElement;
    const overflow = document.body.style.getPropertyValue("overflow");
    const overflowPriority = document.body.style.getPropertyPriority("overflow");
    const isolated: { element: HTMLElement; inert: boolean; hidden: string | null }[] = [];
    const formId = workspace.querySelector("button[form]")?.getAttribute("form");
    if (!workspace.contains(previousFocus)) workspace.focus({ preventScroll: true });
    document.body.style.setProperty("overflow", "hidden");
    let current: HTMLElement | null = workspace;
    while (current?.parentElement) {
      for (const sibling of current.parentElement.children) {
        if (!(sibling instanceof HTMLElement) || sibling === current) continue;
        if (sibling.matches("script, style, link, [data-portal], [data-mantine-portal]")) continue;
        if (sibling instanceof HTMLFormElement && sibling.id === formId) continue;
        isolated.push({ element: sibling, inert: sibling.inert, hidden: sibling.getAttribute("aria-hidden") });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      }
      current = current.parentElement;
      if (!fullscreen && current === managementMain) break;
      if (current === document.body) break;
    }
    return () => {
      document.body.style.setProperty("overflow", overflow, overflowPriority);
      for (const { element, inert, hidden } of isolated) {
        element.inert = inert;
        if (hidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", hidden);
      }
      if (!workspace.isConnected && previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [fullscreen]);
  return { fullscreen, ref, toggleFullscreen: () => setFullscreen((current) => !current) };
}
