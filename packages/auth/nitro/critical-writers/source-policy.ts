import { everyoneGroup } from "@homarr/definitions";

import { CriticalWriterCurrentnessError, CriticalWriterSourceError } from "./contracts";
import type { CurrentGroupFacts, CurrentGroupParent } from "./contracts";

export function assertCandidateAdmin(facts: CurrentGroupFacts): void {
  if (!facts.permissions.includes("admin")) throw new CriticalWriterSourceError("forbidden", "Permission denied");
}

export function requireCandidateGroup(group: CurrentGroupParent | undefined): CurrentGroupParent {
  if (!group) throw new CriticalWriterSourceError("not-found", "Group not found");
  return group;
}

export function assertCandidateGroupDeletion(group: CurrentGroupParent): void {
  if (group.name === everyoneGroup)
    throw new CriticalWriterSourceError("forbidden", "Action is forbidden for reserved group names");
}

export function assertSameMemberships(expected: readonly string[], current: readonly string[]): void {
  const left = [...expected].sort();
  const right = [...current].sort();
  if (left.length !== right.length || left.some((id, index) => id !== right[index]))
    throw new CriticalWriterCurrentnessError();
}

export function assertSameParents(
  expected: readonly CurrentGroupParent[],
  locked: ReadonlyMap<string, CurrentGroupParent>,
): void {
  for (const group of expected) {
    if (locked.get(group.id)?.name !== group.name) throw new CriticalWriterCurrentnessError();
  }
}

export function prepareExternalMembershipChanges(
  memberships: readonly CurrentGroupParent[],
  matchingGroups: readonly CurrentGroupParent[],
  externalGroups: readonly string[],
): { readonly insert: readonly string[]; readonly remove: readonly string[] } {
  const missingNames = externalGroups.filter((name) => !memberships.some((group) => group.name === name));
  return {
    insert: matchingGroups.filter((group) => missingNames.includes(group.name)).map((group) => group.id),
    remove: memberships
      .filter((group) => !externalGroups.concat(everyoneGroup).includes(group.name))
      .map((group) => group.id),
  };
}
