import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error: unknown) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
