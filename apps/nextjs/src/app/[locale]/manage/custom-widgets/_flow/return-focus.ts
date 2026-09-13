/** Popup navigation may remove the original opener; keep keyboard focus in the workbench. */
export function restoreWorkbenchFocus(workspace: HTMLElement | null, previous: HTMLElement | null, selected: string) {
  const node = workspace?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(selected)}"]`);
  for (const target of [previous, node, workspace]) {
    if (!target?.isConnected || !target.checkVisibility() || target.closest("[inert]")) continue;
    target.focus({ preventScroll: true });
    if (document.activeElement === target) return target;
  }
  return null;
}
