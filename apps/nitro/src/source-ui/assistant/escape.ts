const escapeOwnerSelector = [
  '[data-mantine-stop-propagation="true"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(", ");

export const isEscapeOwnedByNestedOverlay = (target: EventTarget | null, advancedSurface: Element | null) => {
  const escapeOwner = target instanceof Element ? target.closest(escapeOwnerSelector) : null;
  if (escapeOwner !== null && escapeOwner !== advancedSurface) return true;

  return Array.from(document.querySelectorAll(escapeOwnerSelector)).some(
    (owner) =>
      owner !== advancedSurface &&
      owner.getAttribute("aria-hidden") !== "true" &&
      owner.closest('[aria-hidden="true"]') === null &&
      owner.getClientRects().length > 0,
  );
};
