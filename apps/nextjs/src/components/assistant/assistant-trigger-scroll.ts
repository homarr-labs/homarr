export const getNearestTriggerScrollTop = ({
  scrollTop,
  viewportTop,
  viewportBottom,
  itemTop,
  itemBottom,
}: {
  scrollTop: number;
  viewportTop: number;
  viewportBottom: number;
  itemTop: number;
  itemBottom: number;
}) => {
  if (itemTop < viewportTop) return Math.max(0, scrollTop - (viewportTop - itemTop));
  if (itemBottom > viewportBottom) return scrollTop + (itemBottom - viewportBottom);
  return scrollTop;
};
