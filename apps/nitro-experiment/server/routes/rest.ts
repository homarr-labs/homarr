import { defineHandler } from "nitro";

import { runFixtureRequest } from "../../src/server/context/http";
import { handleRest } from "../../src/server/rest/handlers";

export default defineHandler((event) => runFixtureRequest(event.req, handleRest));
