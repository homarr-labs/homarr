// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./undici-log-agent-override";

import { jobs } from "./jobs";
import { seedServerSettingsAsync } from "./seed-server-settings";

jobs.startAll();

void seedServerSettingsAsync();
