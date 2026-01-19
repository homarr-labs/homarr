import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { BackupImporter, FullExporter } from "@homarr/backup";
import { db } from "@homarr/db";

interface RestoreBody {
  fileContent?: string;
  mode?: string;
  createBackupFirst?: boolean;
}

/**
 * POST /api/backup/restore
 * Restore from a backup (admin only)
 * Body: {
 *   fileContent: string,      // Base64 encoded
 *   mode?: "full" | "merge",  // Default: "merge"
 *   createBackupFirst?: boolean // Default: true
 * }
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

  let body: RestoreBody;
  try {
    body = (await req.json()) as RestoreBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.fileContent || typeof body.fileContent !== "string") {
    return NextResponse.json({ error: "fileContent is required and must be a base64 string" }, { status: 400 });
  }

  if (body.mode !== undefined && body.mode !== "full" && body.mode !== "merge") {
    return NextResponse.json({ error: "mode must be 'full' or 'merge'" }, { status: 400 });
  }
  const mode = body.mode === "full" ? "full" : "merge";

  const createBackupFirst = body.createBackupFirst ?? true;

  try {
    // Create pre-restore backup if requested
    if (createBackupFirst) {
      const exporter = new FullExporter(db);
      await exporter.exportAsync({
        name: `Pre-restore backup ${new Date().toISOString()}`,
        userId: session.user.id,
      });
    }

    const importer = new BackupImporter(db);
    const result = await importer.importAsync(body.fileContent, {
      mode,
    });

    // Determine redirect action based on admin status and restore mode
    const isFullRestore = mode === "full";
    const credentialsEnabled = isProviderEnabled("credentials");

    // After full restore:
    // - If no admin user exists AND credentials are enabled -> redirect to onboarding
    // - If admin user exists -> redirect to login (session was cleared)
    // - For merge mode -> no redirect needed (session preserved)
    const requiresOnboarding = isFullRestore && !result.hasAdminUser && credentialsEnabled;
    const requiresLogin = isFullRestore && result.hasAdminUser;

    return NextResponse.json({
      ...result,
      requiresOnboarding,
      requiresLogin,
    });
  } catch (error) {
    console.error("Backup restore failed:", error);
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 500 });
  }
}
