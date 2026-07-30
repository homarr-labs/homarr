import { NextResponse } from "next/server";

import { auth } from "@homarr/auth/next";

export const requireCustomWidgetAdmin = async (): Promise<NextResponse | null> => {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
  return null;
};
