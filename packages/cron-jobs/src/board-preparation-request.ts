import { env } from "@homarr/common/env";
import { createKeyedFingerprint, verifyKeyedFingerprint } from "@homarr/common/server";

export const preparedBoardPath = "/prepared-board";
export const preparationEndpoint = "/api/board-preparation";
const signatureHeader = "x-homarr-board-preparation";

const signedValue = (method: string, path: string, timestamp: number) =>
  `homarr-board-preparation-v1:${method}:${path}:${timestamp}`;

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
  if (!fingerprint || !Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 30_000) return false;
  const url = new URL(request.url);
  return verifyKeyedFingerprint(signedValue(request.method, url.pathname + url.search, timestamp), fingerprint);
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
