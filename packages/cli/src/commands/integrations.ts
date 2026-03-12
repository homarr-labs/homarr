import { command } from "@drizzle-team/brocli";

import { integrationsDelete } from "./integrations-delete";
import { integrationsList } from "./integrations-list";

export const integrationsRoot = command({
  name: "integrations",
  desc: "Group of commands to manage integrations",
  subcommands: [integrationsList, integrationsDelete],
});
