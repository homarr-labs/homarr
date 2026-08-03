const isVerticalScrollContainer = (element: Element) => {
  if (element.scrollHeight <= element.clientHeight) return false;

  const overflowY = getComputedStyle(element).overflowY;
  return overflowY === "auto" || overflowY === "scroll";
};

const canScrollVertically = (element: Element, delta: number) => {
  return delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight;
};

export const redirectShiftWheel = (root: HTMLElement, target: EventTarget | null, delta: number) => {
  if (delta === 0) return false;

  let current = target instanceof Element ? target : null;
  while (current && root.contains(current)) {
    const isCurrentScrollContainer = isVerticalScrollContainer(current);
    if (isCurrentScrollContainer && canScrollVertically(current, delta)) {
      current.scrollTop += delta;
      return true;
    }
    if (current === root) break;
    current = current.parentElement;
  }

  // A nested control can reach its edge before the widget's main Mantine viewport.
  // Hand the gesture to that viewport instead of making Shift+wheel feel stuck.
  const viewport = [...root.querySelectorAll<HTMLElement>("[data-scrollbars='y'], [data-scrollbars='xy']")].find(
    (element) => isVerticalScrollContainer(element) && canScrollVertically(element, delta),
  );
  if (!viewport) return false;

  viewport.scrollTop += delta;
  return true;
};
