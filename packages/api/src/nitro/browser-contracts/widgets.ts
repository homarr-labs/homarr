import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";

import type { createWidgetProcedures } from "../routers/widgets";

export type NativeWidgetInputs = InferRouterInputs<ReturnType<typeof createWidgetProcedures>>;
export type NativeWidgetOutputs = InferRouterOutputs<ReturnType<typeof createWidgetProcedures>>;
