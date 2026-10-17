import { expect, it } from "vitest";

import { installReplayStorage } from "./storage";

it("keeps replay writes out of browser storage and starts each import with separate fresh stores", () => {
  const browserLocal = window.localStorage;
  const browserSession = window.sessionStorage;
  const localDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
  const sessionDescriptor = Object.getOwnPropertyDescriptor(window, "sessionStorage");
  const payload = { localStates: [] };
  const key = "snapshot-storage-boundary";
  browserLocal.setItem(key, "browser-local");
  browserSession.setItem(key, "browser-session");
  try {
    installReplayStorage(payload, new Date().toISOString());
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(key)).toBeNull();
    window.localStorage.setItem(key, "replay-local");
    window.sessionStorage.setItem(key, "replay-session");
    expect(window.localStorage.getItem(key)).toBe("replay-local");
    expect(window.sessionStorage.getItem(key)).toBe("replay-session");
    expect(browserLocal.getItem(key)).toBe("browser-local");
    expect(browserSession.getItem(key)).toBe("browser-session");

    installReplayStorage(payload, new Date().toISOString());
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(browserLocal.getItem(key)).toBe("browser-local");
    expect(browserSession.getItem(key)).toBe("browser-session");
  } finally {
    if (localDescriptor) Object.defineProperty(window, "localStorage", localDescriptor);
    else delete (window as unknown as Record<string, unknown>).localStorage;
    if (sessionDescriptor) Object.defineProperty(window, "sessionStorage", sessionDescriptor);
    else delete (window as unknown as Record<string, unknown>).sessionStorage;
    browserLocal.removeItem(key);
    browserSession.removeItem(key);
  }
});
