import type { IconReadScope } from "@homarr/icons";

import type { BackendContext } from "../../context";

export interface IconProcedureResources {
  runReadAsync<T>(context: BackendContext, operation: (scope: IconReadScope) => Promise<T>): Promise<T>;
}
