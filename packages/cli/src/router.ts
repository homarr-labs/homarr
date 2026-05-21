import { fixUsernamesHandler } from "./commands/fix-usernames";
import { integrationsDeleteHandler } from "./commands/integrations-delete";
import { integrationsListHandler } from "./commands/integrations-list";
import { recreateAdminHandler } from "./commands/recreate-admin";
import { resetPasswordHandler } from "./commands/reset-password";
import { usersDeleteHandler } from "./commands/users-delete";
import { usersListHandler } from "./commands/users-list";
import { usersUpdatePasswordHandler } from "./commands/users-update-password";
import { CliError } from "./errors";

const VERSION = "1.0.0";

type CommandHandler = (args: string[]) => Promise<number>;

interface CommandDef {
  handler: CommandHandler;
  desc: string;
  usage: string;
}

type CommandGroup = Record<string, CommandDef>;

const topLevelCommands: Record<string, CommandDef> = {
  "reset-password": {
    handler: resetPasswordHandler,
    desc: "Reset password for a credentials user",
    usage: "homarr reset-password -u <username>",
  },
  "fix-usernames": {
    handler: (args) => fixUsernamesHandler(),
    desc: "Lowercase all credentials usernames",
    usage: "homarr fix-usernames",
  },
  "recreate-admin": {
    handler: recreateAdminHandler,
    desc: "Create credentials admin if none exists",
    usage: "homarr recreate-admin -u <username>",
  },
};

const commandGroups: Record<string, CommandGroup> = {
  users: {
    list: {
      handler: (args) => usersListHandler(args),
      desc: "List all users",
      usage: "homarr users list [--json]",
    },
    delete: {
      handler: usersDeleteHandler,
      desc: "Delete a user by id or username",
      usage: "homarr users delete --id <id> | --username <name>",
    },
    "update-password": {
      handler: usersUpdatePasswordHandler,
      desc: "Set password for a credentials user",
      usage: "homarr users update-password (--id <id> | --username <name>) --password <pw>",
    },
  },
  integrations: {
    list: {
      handler: (args) => integrationsListHandler(args),
      desc: "List all integrations",
      usage: "homarr integrations list [--json]",
    },
    delete: {
      handler: integrationsDeleteHandler,
      desc: "Delete an integration by id or name",
      usage: "homarr integrations delete --id <id> | --name <name>",
    },
  },
};

const HELP_TEXT = `homarr-cli ${VERSION}

Usage:
  homarr <command> [options]

Commands:
  reset-password         Reset password for a credentials user
  recreate-admin         Create credentials admin if none exists
  fix-usernames          Lowercase all credentials usernames
  users list             List all users
  users delete           Delete a user by id or username
  users update-password  Set password for a credentials user
  integrations list      List all integrations
  integrations delete    Delete an integration by id or name

Global Options:
  -h, --help             Show help (use after a command for command-specific help)
  -v, --version          Show CLI version
`;

const printHelp = () => {
  console.log(HELP_TEXT);
};

const printCommandHelp = (def: CommandDef) => {
  console.log(`${def.desc}\n`);
  console.log(`Usage:\n  ${def.usage}\n`);
};

const resolveHandler = (argv: string[]): { handler: CommandHandler; args: string[] } => {
  const [command, subcommand, ...rest] = argv;

  if (!command) {
    throw new CliError("Missing command", 2);
  }

  const group = commandGroups[command];
  if (group) {
    if (!subcommand || subcommand === "--help" || subcommand === "-h") {
      const subcommands = Object.entries(group)
        .map(([name, def]) => `  ${name.padEnd(18)} ${def.desc}`)
        .join("\n");
      console.log(`Usage:\n  homarr ${command} <subcommand> [options]\n\nSubcommands:\n${subcommands}\n`);
      return { handler: async () => subcommand ? 0 : 2, args: [] };
    }

    const def = group[subcommand];
    if (!def) {
      throw new CliError(`Unknown subcommand "${subcommand}" for "${command}"`, 2);
    }

    if (hasFlag(rest, "--help", "-h")) {
      printCommandHelp(def);
      return { handler: async () => 0, args: [] };
    }

    return { handler: def.handler, args: rest };
  }

  const def = topLevelCommands[command];
  if (!def) {
    throw new CliError(`Unknown command "${command}"`, 2);
  }

  const args = argv.slice(1);
  if (hasFlag(args, "--help", "-h")) {
    printCommandHelp(def);
    return { handler: async () => 0, args: [] };
  }

  return { handler: def.handler, args };
};

const hasFlag = (argv: string[], flag: string, short: string) =>
  argv.some((arg) => arg === flag || arg === short);

export const runCliAsync = async (argv: string[]): Promise<number> => {
  if (hasFlag(argv, "--help", "-h") && argv.length === 1) {
    printHelp();
    return 0;
  }

  if (hasFlag(argv, "--version", "-v")) {
    console.log(VERSION);
    return 0;
  }

  if (argv.length === 0) {
    printHelp();
    return 2;
  }

  const { handler, args } = resolveHandler(argv);
  return handler(args);
};
