import type { Session } from "next-auth";

import type { WidgetDefinition } from "../../widgets/src";
import type { RestrictionLevel } from "../../widgets/src/definition";

export const isWidgetRestricted = <TDefinition extends WidgetDefinition>(props: {
  definition: TDefinition;
  user: Session["user"] | null;
  check: (level: RestrictionLevel) => boolean;
}) => {
  if (!("restrict" in props.definition)) return false;
  if (props.definition.restrict === undefined) return false;
  return props.check(props.definition.restrict({ user: props.user ?? null }));
};
