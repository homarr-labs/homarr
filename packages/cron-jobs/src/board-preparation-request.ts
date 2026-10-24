import { env } from "@homarr/common/env";
import { createKeyedFingerprint, verifyKeyedFingerprint } from "@homarr/common/server";

const preparationEndpoint = "/api/board-preparation";
const signatureHeader = "x-homarr-board-preparation";
const captureHeader = "x-homarr-board-capture";
const signatureLifetimeMs = 30_000;

const signedValue = (method: string, path: string, timestamp: number) =>
  `homarr-board-preparation-v1:${method}:${path}:${timestamp}`;
const signedCapture = (viewId: string, timestamp: number) => `homarr-board-capture-v1:${viewId}:${timestamp}`;

const isFresh = (timestamp: number) =>
  Number.isSafeInteger(timestamp) && Math.abs(Date.now() - timestamp) <= signatureLifetimeMs;

export const createPreparationHeaders = (method: string, path: string) => {
  if (!env.SECRET_ENCRYPTION_KEY) throw new Error("Board preparation requires a configured encryption key");
  const timestamp = Date.now();
  return {
    [signatureHeader]: `${timestamp}.${createKeyedFingerprint(signedValue(method, path, timestamp))}`,
  };
};

export const isPreparationRequest = (request: Request) => {
  if (!env.SECRET_ENCRYPTION_KEY) return false;
  const signature = request.headers.get(signatureHeader);
  if (!signature) return false;
  const [time, fingerprint] = signature.split(".");
  const timestamp = Number(time);
  if (!fingerprint || !isFresh(timestamp)) return false;
  const url = new URL(request.url);
  return verifyKeyedFingerprint(signedValue(request.method, url.pathname + url.search, timestamp), fingerprint);
};

export const createCaptureHeaders = (viewId: string) => {
  if (!env.SECRET_ENCRYPTION_KEY) throw new Error("Board preparation requires a configured encryption key");
  const timestamp = Date.now();
  return { [captureHeader]: `${viewId}.${timestamp}.${createKeyedFingerprint(signedCapture(viewId, timestamp))}` };
};

export const readCaptureViewId = (headers: Pick<Headers, "get">) => {
  if (!env.SECRET_ENCRYPTION_KEY) return null;
  const [viewId, time, fingerprint] = headers.get(captureHeader)?.split(".") ?? [];
  const timestamp = Number(time);
  if (!viewId || !fingerprint || !isFresh(timestamp)) return null;
  if (!verifyKeyedFingerprint(signedCapture(viewId, timestamp), fingerprint)) return null;
  return viewId;
};

export const getPreparationOrigin = () => {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid application port");
  return `http://127.0.0.1:${port}`;
};

export const requestBoardPreparationAsync = async ({ viewId, boardId }: { viewId?: string; boardId?: string } = {}) => {
  let path = preparationEndpoint;
  if (viewId) path += `?view=${encodeURIComponent(viewId)}`;
  else if (boardId) path += `?board=${encodeURIComponent(boardId)}`;
  const response = await fetch(getPreparationOrigin() + path, {
    method: "POST",
    headers: createPreparationHeaders("POST", path),
    redirect: "error",
    signal: AbortSignal.timeout(5 * 60_000),
  });
  if (!response.ok) throw new Error(`Board preparation returned HTTP ${response.status}`);
  await response.arrayBuffer();
};
