import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { FullExporter } from "@homarr/backup";
import { db, desc, eq } from "@homarr/db";
import { backups } from "@homarr/db/schema";

/**
 * GET /api/backup
 * List all backups (own backups for users, all backups for admins)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.permissions.includes("admin");

  const backupsList = await db.query.backups.findMany({
    where: isAdmin ? undefined : eq(backups.createdBy, session.user.id),
    orderBy: desc(backups.createdAt),
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

  return NextResponse.json(backupsList);
}

/**
 * POST /api/backup
 * Create a full system backup (admin only)
 * Body: { name?: string }
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

  let body: { name?: string } = {};
  try {
    body = (await req.json()) as { name?: string };
  } catch {
    // Empty body is allowed
  }

  const name = body.name;
  if (name !== undefined && (typeof name !== "string" || name.length === 0 || name.length > 100)) {
    return NextResponse.json({ error: "Invalid name - must be 1-100 characters" }, { status: 400 });
  }

  try {
    const exporter = new FullExporter(db);
    const backup = await exporter.exportAsync({
      name,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        id: backup.id,
        fileName: backup.fileName,
        fileSize: backup.fileSize,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create backup:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}
