import { closeApplication } from "@homarr/backend/host";
import { createLifecyclePlugin } from "../lifecycle";

export default createLifecyclePlugin(() => closeApplication());
