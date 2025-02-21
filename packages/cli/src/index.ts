import { run } from "@drizzle-team/brocli";

import { fixUsernames } from "./commands/fix-usernames";
import { resetPassword } from "./commands/reset-password";

const commands = [resetPassword, fixUsernames];

void run(commands, {
  name: "homarr-cli",
  version: "1.0.0",
});
