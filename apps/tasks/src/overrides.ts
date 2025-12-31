import { UndiciHttpAgent } from "@homarr/core/infrastructure/http";
import { setGlobalDispatcher } from "undici";

setGlobalDispatcher(new UndiciHttpAgent());
