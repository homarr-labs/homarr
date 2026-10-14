import { implement } from "@orpc/server";

import { rpcContract } from "../../contracts/rpc";
import type { RequestContext } from "../context/request";

export const rpc = implement(rpcContract).$context<RequestContext>();
