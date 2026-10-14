import { defineHandler } from "nitro";

import { runFixtureRequest } from "../../src/server/context/http";
import { handleSource } from "../../src/server/widget/handlers";

export default defineHandler((event) => runFixtureRequest(event.req, handleSource));
