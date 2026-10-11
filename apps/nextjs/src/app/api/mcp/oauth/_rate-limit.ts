interface RateLimitStore {
  attempts: Map<string, { count: number; resetAt: number }>;
  failures: Map<string, { count: number; resetAt: number }>;
  timer: ReturnType<typeof setInterval> | null;
}

declare global {
  var mcpOAuthRateLimits: RateLimitStore | undefined;
}

const store = (globalThis.mcpOAuthRateLimits ??= { attempts: new Map(), failures: new Map(), timer: null });
const WINDOW_MS = 60_000;

if (!store.timer) {
  store.timer = setInterval(() => {
    for (const map of [store.attempts, store.failures]) {
      for (const [ip, value] of map) {
        if (value.resetAt <= Date.now()) map.delete(ip);
      }
    }
  }, WINDOW_MS);
  store.timer.unref();
}

function ipAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function record(map: RateLimitStore["attempts"], request: Request) {
  const ip = ipAddress(request);
  const previous = map.get(ip);
  if (!previous || previous.resetAt <= Date.now()) map.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else previous.count++;
}

export function registrationAllowed(request: Request) {
  const entry = store.attempts.get(ipAddress(request));
  if (entry && entry.resetAt > Date.now() && entry.count >= 5) return false;
  record(store.attempts, request);
  return true;
}

export function tokenAllowed(request: Request) {
  const entry = store.failures.get(ipAddress(request));
  return !entry || entry.resetAt <= Date.now() || entry.count < 10;
}

export function recordTokenFailure(request: Request) {
  record(store.failures, request);
}
