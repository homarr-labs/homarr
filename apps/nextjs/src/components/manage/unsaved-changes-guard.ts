interface UnsavedChangesGuardOptions {
  isDirty(): boolean;
  confirmNavigation(href: string): void;
  guardBeforeUnload?: boolean;
}

export function registerUnsavedChangesGuard({
  isDirty,
  confirmNavigation,
  guardBeforeUnload = true,
}: UnsavedChangesGuardOptions) {
  let currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const handleClick = (event: MouseEvent) => {
    if (!isDirty() || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const eventTarget = event.target instanceof Element ? event.target : null;
    const anchor = eventTarget?.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const destination = new URL(anchor.href, window.location.href);
    const current = new URL(window.location.href);
    if (destination.origin !== current.origin) return;
    if (destination.pathname === current.pathname && destination.search === current.search) {
      currentHref = `${destination.pathname}${destination.search}${destination.hash}`;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    confirmNavigation(`${destination.pathname}${destination.search}${destination.hash}`);
  };
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = true;
  };
  const handlePopState = () => {
    const destination = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!isDirty()) {
      currentHref = destination;
      return;
    }

    const destinationUrl = new URL(destination, window.location.origin);
    const currentUrl = new URL(currentHref, window.location.origin);
    if (destinationUrl.pathname === currentUrl.pathname && destinationUrl.search === currentUrl.search) {
      currentHref = destination;
      return;
    }

    window.history.pushState(window.history.state, "", currentHref);
    confirmNavigation(destination);
  };

  document.addEventListener("click", handleClick, true);
  if (guardBeforeUnload) window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("popstate", handlePopState);
  return () => {
    document.removeEventListener("click", handleClick, true);
    if (guardBeforeUnload) window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("popstate", handlePopState);
  };
}
