const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const port = Number(process.env.PORT ?? 47610);
const issuer = process.env.ISSUER ?? `http://host.docker.internal:${port}`;
const homarrBase = process.env.HOMARR_BASE ?? "http://localhost:47606";
const clientId = process.env.CLIENT_ID ?? "homarr-fixture-client";
const clientSecret = process.env.CLIENT_SECRET ?? "homarr-fixture-secret";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: "jwk" });
publicJwk.kid = "homarr-fixture-key";
publicJwk.use = "sig";
publicJwk.alg = "RS256";
const codes = new Map();
const events = [];
const claims = {
  sub: "fixture-user-1",
  email: "fixture-user@example.test",
  email_verified: true,
  preferred_username: "fixture-user",
  name: "Fixture User",
  groups: ["homarr-admins"],
};

const base64url = (value) => Buffer.from(value).toString("base64url");
const signJwt = (extra = {}) => {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: publicJwk.kid }));
  const payload = base64url(
    JSON.stringify({
      ...claims,
      iss: issuer,
      aud: clientId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      ...extra,
    }),
  );
  const input = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
  return `${input}.${signature}`;
};

const json = (res, status, body, headers = {}) => {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
  res.end(text);
};

const readForm = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
};

const record = (event) => {
  events.push({ at: new Date().toISOString(), ...event });
  if (events.length > 200) events.shift();
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", issuer);
  record({ event: "request", method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });

  if (req.method === "GET" && url.pathname === "/.well-known/openid-configuration") {
    return json(res, 200, {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      end_session_endpoint: `${issuer}/end-session`,
      response_types_supported: ["code", "id_token", "token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "email", "profile", "groups"],
      claims_supported: ["sub", "email", "email_verified", "preferred_username", "name", "groups"],
    });
  }

  if (req.method === "GET" && url.pathname === "/jwks") return json(res, 200, { keys: [publicJwk] });

  if (req.method === "GET" && url.pathname === "/authorize") {
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");
    const responseType = url.searchParams.get("response_type") || "code";
    const nonce = url.searchParams.get("nonce");
    record({ event: "authorize", responseType, redirectUri, statePresent: Boolean(state), fragmentMode: responseType !== "code" });
    if (!redirectUri) return json(res, 400, { error: "invalid_request", error_description: "redirect_uri is required" });

    if (responseType === "code") {
      const code = crypto.randomBytes(18).toString("hex");
      codes.set(code, { clientId: url.searchParams.get("client_id"), redirectUri, nonce });
      const callback = new URL(redirectUri);
      callback.searchParams.set("code", code);
      if (state) callback.searchParams.set("state", state);
      res.writeHead(302, { location: callback.toString(), "cache-control": "no-store" });
      return res.end();
    }

    const idToken = signJwt(nonce ? { nonce } : {});
    const callback = `${redirectUri}#id_token=${encodeURIComponent(idToken)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;
    res.writeHead(302, { location: callback, "cache-control": "no-store" });
    return res.end();
  }

  if (req.method === "POST" && url.pathname === "/token") {
    const form = await readForm(req);
    const authHeader = req.headers.authorization ?? "";
    const basic = authHeader.startsWith("Basic ")
      ? Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf8")
      : "";
    const [basicClientId, basicSecret] = basic.split(":");
    const suppliedClientId = form.get("client_id") ?? basicClientId;
    const suppliedSecret = form.get("client_secret") ?? basicSecret;
    const code = form.get("code");
    const pending = code ? codes.get(code) : undefined;
    record({ event: "token", codePresent: Boolean(code), clientId: suppliedClientId, authValid: suppliedClientId === clientId && suppliedSecret === clientSecret });
    if (!pending || suppliedClientId !== clientId || suppliedSecret !== clientSecret) {
      return json(res, 401, { error: "invalid_client" });
    }
    codes.delete(code);
    return json(res, 200, { access_token: "fixture-access-token", token_type: "Bearer", expires_in: 300, id_token: signJwt(pending.nonce ? { nonce: pending.nonce } : {}), scope: "openid email profile groups" });
  }

  if (req.method === "GET" && url.pathname === "/userinfo") {
    record({ event: "userinfo" });
    return json(res, 200, claims);
  }

  if (req.method === "GET" && url.pathname === "/end-session") {
    record({ event: "logout-start", callback: url.searchParams.get("post_logout_redirect_uri") });
    const callback = url.searchParams.get("post_logout_redirect_uri") || `${homarrBase}/auth/login?logout=complete`;
    const timer = setTimeout(() => {
      record({ event: "logout-complete", callback });
      res.writeHead(302, { location: callback, "cache-control": "no-store" });
      res.end();
    }, 1500);
    req.on("aborted", () => {
      clearTimeout(timer);
      record({ event: "logout-aborted" });
    });
    res.on("close", () => {
      if (!res.writableEnded) record({ event: "logout-connection-closed-before-end" });
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") return json(res, 200, events);
  if (req.method === "POST" && url.pathname === "/events/reset") {
    events.length = 0;
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ ready: true, issuer, port, clientId }));
});
