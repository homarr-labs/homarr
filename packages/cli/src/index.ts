import { run } from "@drizzle-team/brocli";

import { dnsHostnameTest } from "./commands/dns-lookup-test";
import { dnsUrlTest } from "./commands/dns-url-test";
import { fixUsernames } from "./commands/fix-usernames";
import { recreateAdmin } from "./commands/recreate-admin";
import { resetPassword } from "./commands/reset-password";

const commands = [resetPassword, fixUsernames, recreateAdmin, dnsUrlTest, dnsHostnameTest];

void run(commands, {
  name: "homarr-cli",
  version: "1.0.0",
});
