import React, { type PropsWithChildren, useEffect } from "react";

export default function Root({ children }: PropsWithChildren) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/workshop-sw.js", { scope: "/" });
    }
  }, []);

  return children;
}
