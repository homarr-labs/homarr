import { userAgent } from "next/server";

import { handleMcpRequest as handleBackendMcpRequest } from "@homarr/api/http/mcp/_handler";

import { getPackageVersion } from "~/versions/package-reader";

export const handleMcpRequest = (request: Request) =>
  handleBackendMcpRequest(request, getPackageVersion(), userAgent(request).ua);
