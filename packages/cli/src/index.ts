import { run } from "@drizzle-team/brocli";

import { fixUsernames } from "./commands/fix-usernames";
import { integrationsRoot } from "./commands/integrations";
import { recreateAdmin } from "./commands/recreate-admin";
import { resetPassword } from "./commands/reset-password";
import { usersRoot } from "./commands/users";

const commands = [usersRoot, integrationsRoot, resetPassword, fixUsernames, recreateAdmin];

void run(commands, {
  name: "homarr-cli",
  version: "1.0.0",
});
