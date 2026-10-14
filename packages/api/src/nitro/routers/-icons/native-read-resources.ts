import type { BoundedTransactionOperation } from "@homarr/db/runtime";
import type { IconReadScope } from "@homarr/icons";
import type { createIconNativeReadSource } from "@homarr/icons/native-read";

import type { BackendContext } from "../../context";
import type { IconProcedureResources } from "./resources";

export function createIconProcedureResources(options: {
  readonly source: ReturnType<typeof createIconNativeReadSource>;
  readonly captureOperation: (context: BackendContext) => BoundedTransactionOperation;
  readonly assertCurrent: (context: BackendContext) => void;
}): IconProcedureResources {
  const { source, captureOperation, assertCurrent } = options;

  return {
    async runReadAsync<T>(context: BackendContext, read: (scope: IconReadScope) => Promise<T>): Promise<T> {
      assertCurrent(context);
      const operation = captureOperation(context);
      const result = await source.runReadAsync(operation, async (scope) => {
        assertCurrent(context);
        const value = await read(scope);
        assertCurrent(context);
        return value;
      });
      assertCurrent(context);
      return result;
    },
  };
}
