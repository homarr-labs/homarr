import { NextResponse } from "next/server";

import { auth } from "@homarr/auth/next";

type RouteHandler<Arguments extends unknown[]> = (...args: Arguments) => Response | Promise<Response>;

export const adminRoute =
  <Arguments extends unknown[]>(handler: RouteHandler<Arguments>) =>
  async (...args: Arguments): Promise<Response> => {
    const session = await auth();
    if (!session?.user.permissions.includes("admin")) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    return handler(...args);
  };
