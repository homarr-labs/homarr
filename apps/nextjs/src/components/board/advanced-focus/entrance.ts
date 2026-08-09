export const startAdvancedFocusEntrance = (
  portalTarget: HTMLElement,
  host: HTMLElement,
  surface: HTMLElement,
  readyClass: string,
) => {
  host.append(portalTarget);
  surface.classList.remove(readyClass);

  return requestAnimationFrame(() => {
    if (surface.isConnected) surface.classList.add(readyClass);
  });
};
