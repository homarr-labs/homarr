import fs from "fs/promises";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { db, eq } from "@homarr/db";
import { backups } from "@homarr/db/schema";

/**
 * GET /api/backup/[id]
 * Get backup details
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;

  const backup = await db.query.backups.findFirst({
    where: eq(backups.id, params.id),
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  // Check permissions - must be owner or admin
  const isAdmin = session.user.permissions.includes("admin");
  const isOwner = backup.createdBy === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(backup);
}

/**
 * DELETE /api/backup/[id]
 * Delete a backup (owner or admin)
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;

  const backup = await db.query.backups.findFirst({
    where: eq(backups.id, params.id),
  });

  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  }

  // Check permissions - must be owner or admin
  const isAdmin = session.user.permissions.includes("admin");
  const isOwner = backup.createdBy === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete file from filesystem
  try {
    await fs.unlink(backup.filePath);
  } catch (error) {
    // File might not exist, but we still want to delete the record
    console.warn(`Failed to delete backup file: ${backup.filePath}`, error);
  }

  // Delete database record
  await db.delete(backups).where(eq(backups.id, params.id));

  return NextResponse.json({ success: true });
}
