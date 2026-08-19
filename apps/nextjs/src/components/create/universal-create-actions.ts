import type { GroupPermissionKey } from "@homarr/definitions";

export const universalCreateActionKeys = [
  "widget",
  "app",
  "integration",
  "container",
  "board",
  "workshop",
  "customWidget",
] as const;

export type UniversalCreateActionKey = (typeof universalCreateActionKeys)[number];
export type UniversalCreateActionGroup = "currentBoard" | "library" | "boards";

export interface UniversalCreateContext {
  hasBoardContext: boolean;
  permissions: readonly GroupPermissionKey[];
}

interface UniversalCreateActionDefinition {
  key: UniversalCreateActionKey;
  group: UniversalCreateActionGroup;
  priority: number;
  isVisible: (context: UniversalCreateContext) => boolean;
}

const hasPermission = (context: UniversalCreateContext, permission: GroupPermissionKey) =>
  context.permissions.includes(permission);

const definitions: readonly UniversalCreateActionDefinition[] = [
  {
    key: "widget",
    group: "currentBoard",
    priority: 100,
    isVisible: ({ hasBoardContext }) => hasBoardContext,
  },
  {
    key: "app",
    group: "currentBoard",
    priority: 90,
    isVisible: (context) => context.hasBoardContext || hasPermission(context, "app-create"),
  },
  {
    key: "integration",
    group: "library",
    priority: 80,
    isVisible: (context) => hasPermission(context, "integration-create"),
  },
  {
    key: "container",
    group: "currentBoard",
    priority: 70,
    isVisible: ({ hasBoardContext }) => hasBoardContext,
  },
  {
    key: "board",
    group: "boards",
    priority: 60,
    isVisible: (context) => hasPermission(context, "board-create"),
  },
  {
    key: "workshop",
    group: "library",
    priority: 40,
    isVisible: (context) => hasPermission(context, "admin"),
  },
  {
    key: "customWidget",
    group: "library",
    priority: 30,
    isVisible: (context) => hasPermission(context, "admin"),
  },
];

export interface RankedUniversalCreateAction {
  key: UniversalCreateActionKey;
  group: UniversalCreateActionGroup;
  priority: number;
  name: string;
  description: string;
  keywords?: readonly string[];
}

export const getUniversalCreateActionDefinitions = (context: UniversalCreateContext) =>
  definitions
    .filter((definition) => definition.isVisible(context))
    .map((definition) =>
      definition.key === "app" && !context.hasBoardContext ? { ...definition, group: "library" as const } : definition,
    );

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export const filterAndRankUniversalCreateActions = <TAction extends RankedUniversalCreateAction>(
  actions: readonly TAction[],
  query: string,
) => {
  const normalizedQuery = normalize(query);

  return actions
    .map((action) => {
      const name = normalize(action.name);
      const searchableText = normalize([action.name, action.description, ...(action.keywords ?? [])].join(" "));
      const relevance =
        normalizedQuery.length === 0
          ? 0
          : name === normalizedQuery
            ? 300
            : name.startsWith(normalizedQuery)
              ? 200
              : searchableText.includes(normalizedQuery)
                ? 100
                : -1;

      return { action, relevance };
    })
    .filter(({ relevance }) => relevance >= 0)
    .toSorted((left, right) => right.relevance - left.relevance || right.action.priority - left.action.priority)
    .map(({ action }) => action);
};
