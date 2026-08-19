import type { NextRequest } from "next/server";

import { extractBaseUrlFromHeaders } from "@homarr/common";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET(_req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const [kind, ...rest] = (await props.params).path;
  const baseUrl = extractBaseUrlFromHeaders(_req.headers);

  if (kind === "oauth-authorization-server") {
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

  if (kind === "oauth-protected-resource") {
    const resourcePath = rest.join("/");
    return Response.json(
      {
        resource: resourcePath ? `${baseUrl}/${resourcePath}` : baseUrl,
        authorization_servers: [baseUrl],
      },
      { headers: corsHeaders },
    );
  }

  return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
