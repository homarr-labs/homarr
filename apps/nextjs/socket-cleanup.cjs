// Periodic cleanup of zombie CLOSE-WAIT sockets in Next.js standalone mode.
// Workaround for vercel/next.js#89091 — AfterContext retains ServerResponse
// after client disconnect, leaving sockets in CLOSE-WAIT indefinitely.
//
// Usage: node --require ./socket-cleanup.cjs server.js

const INTERVAL_MS = 60_000; // Check every 60 seconds

setInterval(() => {
  let destroyed = 0;
  for (const handle of process._getActiveHandles()) {
    if (
      handle.constructor?.name === "Socket" &&
      handle.localPort === 3000 &&
      handle.readyState === "writeOnly" &&
      !handle._httpMessage &&
      handle.bytesWritten === 0
    ) {
      handle.destroy();
      destroyed++;
    }
  }
  if (destroyed > 0) {
    console.log(`[socket-cleanup] Destroyed ${destroyed} zombie socket(s)`);
  }
}, INTERVAL_MS).unref(); // unref() so this timer doesn't prevent process exit
