import fs from "fs/promises";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { db, eq } from "@homarr/db";
import { backups } from "@homarr/db/schema";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;

  // Find the backup
  const backup = await db.query.backups.findFirst({
    where: eq(backups.id, params.id),
  });

  if (!backup) {
    notFound();
  }

  // Check permissions - must be owner or admin
  const isAdmin = session.user.permissions.includes("admin");
  const isOwner = backup.createdBy === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Read the backup file
  let content: Uint8Array;
  try {
    const buffer = await fs.readFile(backup.filePath);
    content = new Uint8Array(buffer);
  } catch {
    return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
  }

  // Return the file as a download
  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", `attachment; filename="${backup.name}.zip"`);
  headers.set("Content-Length", content.length.toString());
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(content as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
