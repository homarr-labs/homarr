import { getMcpBaseUrl } from "./_base-url";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function getMcpMetadata(request: Request, path: readonly string[]) {
  const [kind, ...rest] = path;
  const baseUrl = getMcpBaseUrl(request.headers);
  const identifierPath = rest.join("/");

  if (kind === "oauth-authorization-server") {
    let issuer = baseUrl;
    if (identifierPath) issuer = `${baseUrl}/${identifierPath}`;
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
    let resource = `${baseUrl}/api/mcp`;
    if (identifierPath) resource = `${baseUrl}/${identifierPath}`;
    return Response.json({ resource, authorization_servers: [baseUrl] }, { headers: corsHeaders });
  }

  return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
}

export function getMcpMetadataOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
