import type { Session } from "@homarr/auth";
import { getSessionFromRequestAsync } from "@homarr/auth/request-session";

type RouteHandler<Arguments extends unknown[]> = (request: Request, ...args: Arguments) => Response | Promise<Response>;
export type AdminSession = Session;

type SessionRouteHandler<Arguments extends unknown[]> = (
  session: AdminSession,
  request: Request,
  ...args: Arguments
) => Response | Promise<Response>;

export const adminRouteWithSession =
  <Arguments extends unknown[]>(handler: SessionRouteHandler<Arguments>) =>
  async (request: Request, ...args: Arguments): Promise<Response> => {
    const session = await getSessionFromRequestAsync(request);
    if (!session?.user.permissions.includes("admin")) {
      return Response.json({ error: "Administrator access is required." }, { status: 403 });
    }
    return handler(session, request, ...args);
  };

export const adminRoute = <Arguments extends unknown[]>(handler: RouteHandler<Arguments>) =>
  adminRouteWithSession<Arguments>((_session, request, ...args: Arguments) => handler(request, ...args));
