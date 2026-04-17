// Periodic cleanup of zombie CLOSE-WAIT sockets in Next.js standalone mode.
// Workaround for vercel/next.js#89091 — AfterContext retains ServerResponse
// after client disconnect, leaving sockets in CLOSE-WAIT indefinitely.
//
// Usage: node --expose-gc --require ./socket-cleanup.cjs server.js

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
    // Force a major GC now that references are broken.
    // Without this, V8 won't collect the freed objects until heap pressure
    // reaches --max-old-space-size, which may never happen at normal load.
    if (global.gc) {
      global.gc();
      console.log(`[socket-cleanup] Triggered manual garbage collection`);
    }
  }
}, INTERVAL_MS).unref(); // unref() so this timer doesn't prevent process exit
