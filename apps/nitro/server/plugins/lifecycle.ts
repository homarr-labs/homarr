import { closeApplication } from "../../src/server/host";
import { createLifecyclePlugin } from "../lifecycle";

export default createLifecyclePlugin(closeApplication);
