import { defineHandler } from "nitro";

import { runFixtureRequest } from "../../src/server/context/http";
import { handleSourceControl } from "../../src/server/widget/handlers";

export default defineHandler((event) => runFixtureRequest(event.req, handleSourceControl));
