import { command } from "@drizzle-team/brocli";

import { usersDelete } from "./users-delete";
import { usersList } from "./users-list";
import { usersUpdatePassword } from "./users-update-password";

export const usersRoot = command({
  name: "users",
  desc: "Group of commands to manage users",
  subcommands: [usersList, usersDelete, usersUpdatePassword],
});
