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
      resource: baseUrl,
      authorization_servers: [baseUrl],
    },
    { headers: corsHeaders },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
