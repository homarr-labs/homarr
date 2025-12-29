import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { BackupValidator } from "@homarr/backup";

/**
 * POST /api/backup/validate
 * Validate a backup file before import (admin only)
 * Body: { fileContent: string } (Base64 encoded)
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.permissions.includes("admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  let body: { fileContent?: string };
  try {
    body = (await req.json()) as { fileContent?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.fileContent || typeof body.fileContent !== "string") {
    return NextResponse.json({ error: "fileContent is required and must be a base64 string" }, { status: 400 });
  }

  try {
    const validator = new BackupValidator();
    const result = await validator.validateAsync(body.fileContent);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup validation failed:", error);
    return NextResponse.json({ error: "Failed to validate backup" }, { status: 500 });
  }
}
