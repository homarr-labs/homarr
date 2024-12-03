import { objectEntries } from "@homarr/common";
import type { InferInsertModel, Database } from "@homarr/db";
import { schema } from "@homarr/db";

type TableKeys = {
    [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
  }[keyof typeof schema];
  
  export const createDbInsertCollection = () => {
    const context = objectEntries(schema).reduce(
      (acc, [key, value]) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if ("_" in value && value._.brand === "Table") {
          acc[key as TableKeys] = [];
        }
        return acc;
      },
      {} as { [K in TableKeys]: InferInsertModel<(typeof schema)[K]>[] },
    );
  
    return {
      ...context,
      insertAll: (db: Database) => {
        db.transaction((transaction) => {
          for (const [key, value] of objectEntries(context)) {
            if (value.length >= 1) {
              transaction
                .insert(schema[key as TableKeys])
                .values(value)
                .run();
            }
          }
        });
      },
    };
  };