import { TRPCError } from "@trpc/server";

import { createTRPCContext, smartHomeCameraRouter } from "@homarr/api/smart-home-camera";
import { auth } from "@homarr/auth/next";

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ integrationId: string; entityId: string }> },
) => {
  const input = await params;
  const context = createTRPCContext({ headers: request.headers, session: await auth() });
  try {
    return await smartHomeCameraRouter.createCaller(context, { signal: request.signal }).open(input);
  } catch (error) {
    let status = 502;
    if (error instanceof TRPCError) {
      if (error.code === "FORBIDDEN" || error.code === "UNAUTHORIZED") status = 403;
      if (error.code === "NOT_FOUND") status = 404;
      if (error.code === "BAD_REQUEST") status = 400;
    }
    return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  }
};
