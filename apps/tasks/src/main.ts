import { jobs } from "./jobs";
import { seedServerSettingsAsync } from "./seed-server-settings";

jobs.startAll();

void seedServerSettingsAsync();
