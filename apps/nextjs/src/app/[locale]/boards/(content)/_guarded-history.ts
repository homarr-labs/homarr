const getHistoryState = () =>
  window.history.state && typeof window.history.state === "object"
    ? (window.history.state as Record<string, unknown>)
    : {};

interface GuardState {
  key: string;
  id: string;
}

export const classifyGuardedNavigation = (destination: URL, current: URL) => {
  if (destination.href === current.href) return "same-url";
  if (
    destination.origin === current.origin &&
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    return "same-document";
  }
  return "other-document";
};

export const replaceGuardedSameDocumentUrl = (destination: URL, guard: GuardState) => {
  window.history.replaceState(
    {
      ...getHistoryState(),
      [guard.key]: guard.id,
    },
    document.title,
    destination.href,
  );

  if (!destination.hash) {
    window.scrollTo({ top: 0, left: 0 });
    return;
  }

  let targetId = destination.hash.slice(1);
  try {
    targetId = decodeURIComponent(targetId);
  } catch {
    // Keep the encoded value when the fragment contains malformed escape sequences.
  }
  document.getElementById(targetId)?.scrollIntoView();
};

export const removeGuardHistoryEntry = (guardedUrl: string, guardStateKey: string) => {
  window.addEventListener(
    "popstate",
    () => {
      const state = { ...getHistoryState() };
      delete state[guardStateKey];
      window.history.replaceState(state, document.title, guardedUrl);
    },
    { once: true },
  );
  window.history.back();
};
