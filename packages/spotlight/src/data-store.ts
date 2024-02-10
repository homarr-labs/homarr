import { useEffect } from "react";
import { atom, useSetAtom } from "jotai";

import type { SpotlightActionData } from "./type";

const defaultGroups = ["all", "web", "action"];

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
  ).sort((groupA, groupB) => {
    const groupAIndex = defaultGroups.indexOf(groupA);
    const groupBIndex = defaultGroups.indexOf(groupB);
    if (groupAIndex !== -1 && groupBIndex !== -1)
      return groupAIndex - groupBIndex;
    if (groupAIndex !== -1) return -1;
    if (groupBIndex !== -1) return 1;
    return 0;
  }),
);

const registrations: Record<string, number> = {};

export const useRegisterSpotlightActions = (
  key: string,
  actions: SpotlightActionData[],
) => {
  const setActions = useSetAtom(actionsAtom);

  useEffect(() => {
    console.log("before", key, registrations);
    if (!registrations[key]) {
      setActions((prev) => ({
        ...prev,
        [key]: actions,
      }));
    }
    registrations[key] = (registrations[key] ?? 0) + 1;
    console.log("after", key, registrations);

    return () => {
      console.log("cleanup", key, registrations);
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
      console.log("cleanup after", key, registrations);
    };
  }, [key]);
};
