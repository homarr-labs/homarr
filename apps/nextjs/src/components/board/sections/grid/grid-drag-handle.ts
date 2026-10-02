export const observeGridDragHandle = (
  container: HTMLElement,
  selector: string,
  bind: (element: HTMLElement | null) => void,
) => {
  let observer: MutationObserver | null = null;
  const bindFirstHandle = () => {
    const handle = container.querySelector<HTMLElement>(selector);
    if (!handle) return false;
    bind(handle);
    observer?.disconnect();
    observer = null;
    return true;
  };

  if (!bindFirstHandle()) {
    observer = new MutationObserver(bindFirstHandle);
    observer.observe(container, { childList: true, subtree: true });
  }

  return () => {
    observer?.disconnect();
    bind(null);
  };
};
