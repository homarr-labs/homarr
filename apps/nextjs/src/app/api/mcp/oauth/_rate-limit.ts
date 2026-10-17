import { resolveRequestIdentity } from "@homarr/common/server";

interface RateLimitStore {
  attempts: Map<string, { count: number; resetAt: number }>;
  failures: Map<string, { count: number; resetAt: number }>;
  tokenAttempts: Map<string, { count: number; resetAt: number }>;
  timer: ReturnType<typeof setInterval> | null;
}

declare global {
  var mcpOAuthRateLimits: RateLimitStore | undefined;
}

const store = (globalThis.mcpOAuthRateLimits ??= {
  attempts: new Map(),
  failures: new Map(),
  tokenAttempts: new Map(),
  timer: null,
});
const WINDOW_MS = 60_000;

if (!store.timer) {
  store.timer = setInterval(() => {
    for (const map of [store.attempts, store.failures, store.tokenAttempts]) {
      for (const [ip, value] of map) {
        if (value.resetAt <= Date.now()) map.delete(ip);
      }
    }
  }, WINDOW_MS);
  store.timer.unref();
}

function belowLimit(map: RateLimitStore["attempts"], key: string, limit: number) {
  const entry = map.get(key);
  return !entry || entry.resetAt <= Date.now() || entry.count < limit;
}

function record(map: RateLimitStore["attempts"], key: string) {
  const previous = map.get(key);
  if (!previous || previous.resetAt <= Date.now()) map.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else previous.count++;
}

export function registrationAllowed(request: Request) {
  const { key } = resolveRequestIdentity(request.headers);
  if (!belowLimit(store.attempts, key, 5) || !belowLimit(store.attempts, "global", 50)) return false;
  record(store.attempts, key);
  record(store.attempts, "global");
  return true;
}

export function tokenAllowed(request: Request) {
  const { key } = resolveRequestIdentity(request.headers);
  if (
    !belowLimit(store.failures, key, 10) ||
    !belowLimit(store.tokenAttempts, key, 60) ||
    !belowLimit(store.tokenAttempts, "global", 300)
  )
    return false;
  record(store.tokenAttempts, key);
  record(store.tokenAttempts, "global");
  return true;
}

export function recordTokenFailure(request: Request) {
  record(store.failures, resolveRequestIdentity(request.headers).key);
}
