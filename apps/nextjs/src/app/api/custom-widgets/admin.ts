import { NextResponse } from "next/server";

import type { Session } from "@homarr/auth";
import { auth } from "@homarr/auth/next";

type RouteHandler<Arguments extends unknown[]> = (...args: Arguments) => Response | Promise<Response>;
export type AdminSession = Session;

type SessionRouteHandler<Arguments extends unknown[]> = (
  session: AdminSession,
  ...args: Arguments
) => Response | Promise<Response>;

export const adminRouteWithSession =
  <Arguments extends unknown[]>(handler: SessionRouteHandler<Arguments>) =>
  async (...args: Arguments): Promise<Response> => {
    const session = await auth();
    if (!session?.user.permissions.includes("admin")) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    return handler(session, ...args);
  };

export const adminRoute = <Arguments extends unknown[]>(handler: RouteHandler<Arguments>) =>
  adminRouteWithSession<Arguments>((_session, ...args: Arguments) => handler(...args));
