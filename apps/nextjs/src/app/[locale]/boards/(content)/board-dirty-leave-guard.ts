const sameTabAnchorSelector = "a[href]:not([target='_blank'])";

export interface BoardDirtyLeaveGuard {
  confirmLeave: (href: string) => void;
  guardBeforeUnload: boolean;
}

interface RegisteredBoardDirtyLeaveGuard extends BoardDirtyLeaveGuard {
  registrationId: number;
}

let nextRegistrationId = 0;
const registeredGuards: RegisteredBoardDirtyLeaveGuard[] = [];
let removeDocumentListeners: (() => void) | undefined;

const findSameTabAnchor = (event: MouseEvent) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const eventTarget = event.target instanceof Element ? event.target : null;
  return eventTarget?.closest<HTMLAnchorElement>(sameTabAnchorSelector) ?? null;
};

const handleClick = (event: MouseEvent) => {
  const anchor = findSameTabAnchor(event);
  const guard = registeredGuards[0];
  if (!anchor || !guard) return;

  // preventDefault stops the navigation. Leave the event to reach the link so
  // callers such as the board switcher can still close themselves.
  event.preventDefault();
  guard.confirmLeave(anchor.href);
};

const handlePopState = (event: Event) => {
  if (registeredGuards.length === 0) return;
  window.history.pushState(null, document.title, window.location.href);
  event.preventDefault();
};

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!registeredGuards.some((guard) => guard.guardBeforeUnload)) return;
  event.preventDefault();
  event.returnValue = true;
};

const attachDocumentListeners = () => {
  document.addEventListener("click", handleClick, true);
  window.addEventListener("popstate", handlePopState);
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
    document.removeEventListener("click", handleClick, true);
    window.removeEventListener("popstate", handlePopState);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
};

/**
 * The desktop and mobile headers both mount the edit-mode menu, so this guard
 * is registered twice. One shared listener keeps a single discard dialog and
 * a single history lock.
 */
export const registerBoardDirtyLeaveGuard = (guard: BoardDirtyLeaveGuard) => {
  const registeredGuard: RegisteredBoardDirtyLeaveGuard = {
    ...guard,
    registrationId: nextRegistrationId,
  };
  nextRegistrationId += 1;
  registeredGuards.push(registeredGuard);
  removeDocumentListeners ??= attachDocumentListeners();

  return () => {
    const guardIndex = registeredGuards.findIndex(
      (candidate) => candidate.registrationId === registeredGuard.registrationId,
    );
    if (guardIndex >= 0) registeredGuards.splice(guardIndex, 1);
    if (registeredGuards.length === 0 && removeDocumentListeners) {
      removeDocumentListeners();
      removeDocumentListeners = undefined;
    }
  };
};
