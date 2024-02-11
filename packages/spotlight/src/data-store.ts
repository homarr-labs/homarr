import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";

import type { SpotlightActionData } from "./type";

const defaultGroups = ["all", "web", "action"] as const;
const reversedDefaultGroups = [...defaultGroups].reverse();
const actionsAtom = atom<Record<string, SpotlightActionData[]>>({});
export const actionsAtomRead = atom((get) =>
  Object.values(get(actionsAtom)).flatMap((item) => item),
);

export const groupsAtomRead = atom((get) =>
  Array.from(
    new Set(
      get(actionsAtomRead)
        .map((item) => item.group)
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

const registrations: Record<string, number> = {};

export const useRegisterSpotlightActions = (
  key: string,
  actions: SpotlightActionData[],
) => {
  const setActions = useSetAtom(actionsAtom);

  useEffect(() => {
    if (!registrations[key]) {
      setActions((prev) => ({
        ...prev,
        [key]: actions,
      }));
    }
    registrations[key] = (registrations[key] ?? 0) + 1;

    return () => {
      if (registrations[key] === 1) {
        setActions((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      }

      registrations[key] = registrations[key]! - 1;
      if (registrations[key] === 0) {
        delete registrations[key];
      }
    };
  }, [key]);
};
