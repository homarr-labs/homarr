import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { command, string } from "@drizzle-team/brocli";

import { exportBoardBundleAsync, bundleFilenameForBoard } from "@homarr/board-portability";
import { db } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import { eq } from "@homarr/db";

export const boardsExport = command({
  name: "export",
  desc: "Export a board as a portable JSON bundle",
  options: {
    name: string("name").desc("Name of the board to export").required(),
    output: string("output").alias("o").desc("Output file path (defaults to homarr-board-<name>.json)"),
  },
  // eslint-disable-next-line no-restricted-syntax
  handler: async (opts) => {
    const board = await db.query.boards.findFirst({
      where: eq(boards.name, opts.name),
    });

    if (!board) {
      console.error(`Board "${opts.name}" not found`);
      process.exit(1);
    }

    const result = await exportBoardBundleAsync(db, board.id, "cli");

    if (!result) {
      console.error(`Failed to export board "${opts.name}"`);
      process.exit(1);
    }

    const outputPath = resolve(opts.output ?? bundleFilenameForBoard(board.name));
    writeFileSync(outputPath, result.content, "utf-8");
    console.log(`Board exported to ${outputPath}`);
  },
});
