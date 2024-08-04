import { run } from "@drizzle-team/brocli";

import { resetPassword } from "./commands/reset-password";

const commands = [resetPassword];

void run(commands, {
  cliName: "homarr-cli",
  version: "1.0.0",
});
