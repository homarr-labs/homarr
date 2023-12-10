import type { NextRequest } from "next/server";

import { createHandlers } from "@alparr/auth";

export const GET = async (req: NextRequest) => {
  return await createHandlers(isCredentialsRequest(req)).handlers.GET(req);
};
export const POST = async (req: NextRequest) => {
  return await createHandlers(isCredentialsRequest(req)).handlers.POST(req);
};

const isCredentialsRequest = (req: NextRequest) => {
  return req.url.includes("credentials") && req.method === "POST";
};
