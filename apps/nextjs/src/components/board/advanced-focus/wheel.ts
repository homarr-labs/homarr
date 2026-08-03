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
  return false;
};
