import { NextResponse } from "next/server";

import { auth } from "@homarr/auth/next";

import { env } from "~/env";

export const requireCustomWidgetAdmin = async (): Promise<NextResponse | null> => {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
  if (env.CUSTOM_WIDGETS_ENABLED === false) {
    return NextResponse.json(
      { error: "Custom Widgets are temporarily disabled by the server administrator." },
      { status: 503 },
    );
  }
  return null;
};
