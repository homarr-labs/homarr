import type { PublicHostConfiguration } from "./runtime-composition/contracts";

export function createPublicOriginIngress(baseUrl: PublicHostConfiguration["baseUrl"]) {
  const captured = new URL(baseUrl);
  const publicOrigin = captured.origin;
  const publicAuthority = captured.host;
  const publicProtocol = captured.protocol;
  const nativeOrigin = new URL(`http://${publicAuthority}`).origin;

  return <NativeRequest extends Request>(request: NativeRequest): NativeRequest | null => {
    if ("_url" in request) return null;
    const host = request.headers.get("host");
    if (host === null || host === "") return null;
    for (const character of host) {
      const code = character.charCodeAt(0);
      if (code <= 0x20 || code === 0x7f) return null;
    }
    if (/[,\s]/u.test(host) || host !== publicAuthority) return null;

    try {
      const nativeUrl = request.url;
      const parsed = new URL(nativeUrl);
      if (
        parsed.protocol !== "http:" ||
        parsed.origin !== nativeOrigin ||
        parsed.username ||
        parsed.password ||
        nativeUrl.includes("#") ||
        /^[^:]+:\/\/[^/?#]*@/u.test(nativeUrl)
      ) {
        return null;
      }

      const forwardedHeaders: string[] = [];
      for (const name of request.headers.keys()) {
        const lowerName = name.toLowerCase();
        if (lowerName === "forwarded" || lowerName.startsWith("x-forwarded-")) forwardedHeaders.push(name);
      }

      if (publicProtocol === "https:") {
        const url = publicOrigin + parsed.pathname + parsed.search;
        Object.defineProperty(request, "url", { value: url, enumerable: true, configurable: true });
        if (request.url !== url) return null;
      }
      for (const name of forwardedHeaders) request.headers.delete(name);
      return request;
    } catch {
      return null;
    }
  };
}
