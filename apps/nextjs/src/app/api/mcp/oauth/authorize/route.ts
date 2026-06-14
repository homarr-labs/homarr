import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";

import { consumePendingAuth, createAuthCode, getClient, storePendingAuth } from "../_store";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const session = await auth();

  const pendingId = url.searchParams.get("pending");
  if (pendingId) {
    if (!session?.user) {
      return Response.json(
        {
          error: "access_denied",
          error_description: "Login was not completed",
        },
        { status: 403 },
      );
    }

    const pending = consumePendingAuth(pendingId);
    if (!pending) {
      return Response.json(
        {
          error: "invalid_request",
          error_description: "Authorization request expired, please try again",
        },
        { status: 400 },
      );
    }

    const code = createAuthCode(
      pending.clientId,
      session.user.id,
      pending.codeChallenge,
      pending.codeChallengeMethod,
      pending.redirectUri,
    );
    if (!code) {
      return Response.json(
        {
          error: "server_error",
          error_description: "Server is busy, please try again later",
        },
        { status: 503 },
      );
    }

    const redirect = new URL(pending.redirectUri);
    redirect.searchParams.set("code", code);
    if (pending.state) redirect.searchParams.set("state", pending.state);
    return Response.redirect(redirect.toString());
  }

  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "S256";
  const state = url.searchParams.get("state");

  if (!clientId || !redirectUri || !codeChallenge) {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters",
      },
      { status: 400 },
    );
  }

  if (codeChallengeMethod !== "S256") {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "Only S256 code_challenge_method is supported",
      },
      { status: 400 },
    );
  }

  const client = getClient(clientId);
  if (!client) {
    return Response.json(
      {
        error: "invalid_client",
        error_description:
          "Unknown client_id — the server was restarted and lost the registration. Please re-run the auth command to re-register.",
      },
      { status: 400 },
    );
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return Response.json(
      {
        error: "invalid_request",
        error_description: "redirect_uri not registered",
      },
      { status: 400 },
    );
  }

  if (session?.user) {
    const code = createAuthCode(clientId, session.user.id, codeChallenge, codeChallengeMethod, redirectUri);
    if (!code) {
      return Response.json(
        {
          error: "server_error",
          error_description: "Server is busy, please try again later",
        },
        { status: 503 },
      );
    }

    const redirect = new URL(redirectUri);
    redirect.searchParams.set("code", code);
    if (state) redirect.searchParams.set("state", state);
    return Response.redirect(redirect.toString());
  }

  const id = storePendingAuth({
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state,
  });
  if (!id) {
    return Response.json(
      {
        error: "server_error",
        error_description: "Server is busy, please try again later",
      },
      { status: 503 },
    );
  }

  const loginUrl = new URL("/auth/login", url.origin);
  loginUrl.searchParams.set("callbackUrl", `/api/mcp/oauth/authorize?pending=${id}`);
  return Response.redirect(loginUrl.toString());
}
