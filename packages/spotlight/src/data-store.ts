import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";
import useDeepCompareEffect from "use-deep-compare-effect";

import type { SpotlightActionData, SpotlightActionGroup } from "./type";

const defaultGroups = ["all", "web", "action"] as const;
const reversedDefaultGroups = [...defaultGroups].reverse() as string[];
const actionsAtom = atom<Record<string, readonly SpotlightActionData[]>>({});
export const actionsAtomRead = atom((get) =>
  Object.values(get(actionsAtom)).flatMap((item) => item),
);

export const groupsAtomRead = atom((get) =>
  Array.from(
    new Set(
      get(actionsAtomRead)
        .map((item) => item.group as SpotlightActionGroup) // Allow "all" group to be included in the list of groups
        .concat(...defaultGroups),
    ),
  )
    .sort((groupA, groupB) => {
      const groupAIndex = reversedDefaultGroups.indexOf(groupA);
      const groupBIndex = reversedDefaultGroups.indexOf(groupB);

      // if both groups are not in the default groups, sort them by name (here reversed because we reverse the array afterwards)
      if (groupAIndex === -1 && groupBIndex === -1) {
        return groupB.localeCompare(groupA);
      }

      return groupAIndex - groupBIndex;
    })
    .reverse(),
);

const registrations = new Map<string, number>();

export const useRegisterSpotlightActions = (
  key: string,
  actions: SpotlightActionData[],
  dependencies: readonly unknown[] = [],
) => {
  const setActions = useSetAtom(actionsAtom);

  // Use deep compare effect if there are dependencies for the actions, this supports deep compare of the action dependencies
  const useSpecificEffect =
    dependencies.length >= 1 ? useDeepCompareEffect : useEffect;

  useSpecificEffect(() => {
    if (!registrations.has(key) || dependencies.length >= 1) {
      setActions((prev) => ({
        ...prev,
        [key]: actions,
      }));
    }
    registrations.set(key, (registrations.get(key) ?? 0) + 1);

    return () => {
      if (registrations.get(key) === 1) {
        setActions((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      }

      registrations.set(key, (registrations.get(key) ?? 0) - 1);
      if (registrations.get(key) === 0) {
        registrations.delete(key);
      }
    };
  }, [key, dependencies.length >= 1 ? dependencies : undefined]);
};
