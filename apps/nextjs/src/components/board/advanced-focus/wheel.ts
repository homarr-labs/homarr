const canScrollVertically = (element: HTMLElement, delta: number) => {
  if (element.scrollHeight <= element.clientHeight) return false;

  const overflowY = getComputedStyle(element).overflowY;
  if (overflowY !== "auto" && overflowY !== "scroll") return false;

  return delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight;
};

export const redirectShiftWheel = (root: HTMLElement, target: EventTarget | null, delta: number) => {
  if (delta === 0) return false;

  let current = target instanceof HTMLElement ? target : null;
  while (current && root.contains(current)) {
    if (canScrollVertically(current, delta)) {
      current.scrollTop += delta;
      return true;
    }
    if (current === root) break;
    current = current.parentElement;
  }

  const viewport = [...root.querySelectorAll<HTMLElement>("[data-scrollbars='y'], [data-scrollbars='xy']")].find(
    (element) => canScrollVertically(element, delta),
  );
  if (!viewport) return false;

  viewport.scrollTop += delta;
  return true;
};
