import { setGlobalDispatcher } from "undici/index.js";

import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";

setGlobalDispatcher(new UndiciHttpAgent());
