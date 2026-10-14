import type { and, eq } from "@homarr/db";
import type { sectionCollapseStates, sections } from "@homarr/db/schema";
import type { emptySuperJSON } from "@homarr/definitions";
import type { containerSectionOptionsSchema } from "@homarr/validation/shared";

export interface SectionProcedureResources {
  readonly tables: {
    readonly sectionCollapseStates: typeof sectionCollapseStates;
    readonly sections: typeof sections;
  };
  readonly operators: {
    readonly and: typeof and;
    readonly eq: typeof eq;
  };
  readonly definitions: {
    readonly emptySuperJSON: typeof emptySuperJSON;
  };
  readonly schemas: {
    readonly containerSectionOptionsSchema: typeof containerSectionOptionsSchema;
  };
}
