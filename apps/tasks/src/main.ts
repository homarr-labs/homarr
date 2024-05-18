import { jobs } from "./jobs";
import { seedServerSettings } from "./seed-server-settings";

jobs.startAll();

void seedServerSettings();
