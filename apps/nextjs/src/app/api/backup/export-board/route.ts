import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@homarr/auth/next";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { BoardExporter, generateBoardExportFileName } from "@homarr/backup";
import { db, eq, inArray } from "@homarr/db";
import { boardGroupPermissions, boards, boardUserPermissions, groupMembers } from "@homarr/db/schema";

interface ExportBoardBody {
  boardId?: string;
  includeIntegrations?: boolean;
}

/**
 * POST /api/backup/export-board
 * Export a single board (requires board access)
 * Body: {
 *   boardId: string,
 *   includeIntegrations?: boolean  // Default: false
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ExportBoardBody;
  try {
    body = (await req.json()) as ExportBoardBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.boardId || typeof body.boardId !== "string") {
    return NextResponse.json({ error: "boardId is required" }, { status: 400 });
  }

  const includeIntegrations = body.includeIntegrations ?? false;

  try {
    // Get user's groups for permission check
    const groupsOfCurrentUser = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, session.user.id),
    });

    // Check board access with permissions
    const board = await db.query.boards.findFirst({
      where: eq(boards.id, body.boardId),
      with: {
        userPermissions: {
          where: eq(boardUserPermissions.userId, session.user.id),
        },
        groupPermissions: {
          where: inArray(boardGroupPermissions.groupId, groupsOfCurrentUser.map((group) => group.groupId).concat("")),
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const permissions = constructBoardPermissions(board, session);
    if (!permissions.hasFullAccess) {
      return NextResponse.json({ error: "No permission to export this board" }, { status: 403 });
    }

    const exporter = new BoardExporter(db);
    const data = await exporter.exportAsync(body.boardId, {
      includeIntegrations,
    });

    return NextResponse.json({
      data: JSON.stringify(data, null, 2),
      fileName: generateBoardExportFileName(board.name),
    });
  } catch (error) {
    console.error("Board export failed:", error);
    return NextResponse.json({ error: "Failed to export board" }, { status: 500 });
  }
}
