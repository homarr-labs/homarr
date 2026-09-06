import type { NextRequest } from "next/server";

import { getMcpBaseUrl } from "~/app/api/mcp/_base-url";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  const [kind, ...rest] = (await props.params).path;
  const baseUrl = getMcpBaseUrl(req.headers);
  const identifierPath = rest.join("/");

  if (kind === "oauth-authorization-server") {
    const issuer = identifierPath ? `${baseUrl}/${identifierPath}` : baseUrl;
    return Response.json(
      {
        issuer,
        authorization_endpoint: `${baseUrl}/api/mcp/oauth/authorize`,
        token_endpoint: `${baseUrl}/api/mcp/oauth/token`,
        registration_endpoint: `${baseUrl}/api/mcp/oauth/register`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
        scopes_supported: ["mcp:tools"],
        resource_indicators_supported: true,
      },
      { headers: corsHeaders },
    );
  }

  if (kind === "oauth-protected-resource") {
    const resource = identifierPath ? `${baseUrl}/${identifierPath}` : `${baseUrl}/api/mcp`;
    return Response.json(
      {
        resource,
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
