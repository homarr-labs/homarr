const escapeOwnerSelector = [
  '[data-mantine-stop-propagation="true"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(", ");

export const isEscapeOwnedByNestedOverlay = (target: EventTarget | null, advancedSurface: Element | null) => {
  if (!(target instanceof Element)) return false;

  const escapeOwner = target.closest(escapeOwnerSelector);
  return escapeOwner !== null && escapeOwner !== advancedSurface;
};
