self.addEventListener("install", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  event.waitUntil(self.clients.claim());
});
