import { run } from "@drizzle-team/brocli";
import type { Command } from "@drizzle-team/brocli";

import { harnessRoot, normalizeHarnessEnvironmentArgs } from "./commands/harness";

const harnessCommandNames = new Set(["harness", "local-harness"]);

function isHarnessInvocation(argv: string[]): boolean {
  return argv.slice(2).some((argument) => harnessCommandNames.has(argument));
}

async function main(): Promise<void> {
  const harnessInvocation = isHarnessInvocation(process.argv);
  let commands: Command[];

  if (harnessInvocation) {
    commands = [harnessRoot];
  } else {
    const [{ fixUsernames }, { integrationsRoot }, { recreateAdmin }, { resetPassword }, { usersRoot }] =
      await Promise.all([
        import("./commands/fix-usernames"),
        import("./commands/integrations"),
        import("./commands/recreate-admin"),
        import("./commands/reset-password"),
        import("./commands/users"),
      ]);
    commands = [usersRoot, integrationsRoot, resetPassword, fixUsernames, recreateAdmin, harnessRoot];
  }

  let argSource = process.argv;
  if (harnessInvocation) {
    argSource = normalizeHarnessEnvironmentArgs(process.argv);
  }

  await run(commands, {
    argSource,
    name: "homarr-cli",
    version: "1.0.0",
  });
}

void main();
