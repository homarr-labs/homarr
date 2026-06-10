import { headers } from "next/headers";

import { extractBaseUrlFromHeaders } from "@homarr/common";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET() {
  const baseUrl = extractBaseUrlFromHeaders(await headers());

  return Response.json(
    {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
      registration_endpoint: `${baseUrl}/api/mcp/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp:tools"],
    },
    { headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
