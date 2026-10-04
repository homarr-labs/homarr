export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export interface BrowserNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
}

const maxRememberedOccurrences = 100;

export const getBrowserNotificationPermission = (): BrowserNotificationPermission => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
};

export const requestBrowserNotificationPermission = async (): Promise<BrowserNotificationPermission> => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return await window.Notification.requestPermission();
  } catch {
    return getBrowserNotificationPermission();
  }
};

export const showBrowserNotification = ({ title, body, icon, tag }: BrowserNotificationOptions): boolean => {
  if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") {
    return false;
  }

  try {
    const notification = new window.Notification(title, { body, icon, tag });
    void notification;
    return true;
  } catch {
    return false;
  }
};

export const playBrowserAlertSound = (): boolean => {
  if (typeof window === "undefined") return false;
  const AudioContextConstructor =
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return false;

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
    return true;
  } catch {
    return false;
  }
};

export const addRememberedBrowserAlert = (occurrences: string[], occurrence: string): string[] => {
  const withoutDuplicate = occurrences.filter((value) => value !== occurrence);
  return [...withoutDuplicate, occurrence].slice(-maxRememberedOccurrences);
};

export const claimBrowserAlertOccurrence = (storageKey: string, occurrence: string): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const serialized = window.localStorage.getItem(storageKey);
    const parsed: unknown = serialized === null ? [] : JSON.parse(serialized);
    const occurrences = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
    if (occurrences.includes(occurrence)) return false;
    window.localStorage.setItem(storageKey, JSON.stringify(addRememberedBrowserAlert(occurrences, occurrence)));
    return true;
  } catch {
    return false;
  }
};
