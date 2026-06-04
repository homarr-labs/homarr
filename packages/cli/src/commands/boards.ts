import { command } from "@drizzle-team/brocli";

import { boardsExport } from "./boards-export";
import { boardsList } from "./boards-list";

export const boardsRoot = command({
  name: "boards",
  desc: "Group of commands to manage boards",
  subcommands: [boardsList, boardsExport],
});
