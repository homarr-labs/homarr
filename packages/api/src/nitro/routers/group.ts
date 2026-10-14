import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { and as drizzleAnd, Database, eq as drizzleEq, like as drizzleLike, not as drizzleNot } from "@homarr/db";
import type { groups } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import {
  groupCreateSchema,
  groupSavePartialSettingsSchema,
  groupUpdateSchema,
  groupUserSchema,
} from "@homarr/validation/group";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";

import { authenticatedProcedure } from "../procedure";
import type { SourceLeafPath } from "../port-map";
import type { GroupAdministrationResources } from "./-identity/resources";
import { isGroupMembershipManagedLocally, throwIfGroupMembersCannotBeManagedLocally } from "./-identity/resources";

export interface GroupProcedureResources {
  readonly groups: typeof groups;
  readonly operators: {
    readonly eq: typeof drizzleEq;
    readonly and: typeof drizzleAnd;
    readonly like: typeof drizzleLike;
    readonly not: typeof drizzleNot;
  };
}

export function createGroupProcedures(resources: GroupProcedureResources) {
  const { operators } = resources;
  const { eq, and, like, not } = operators;

  const getAll = authenticatedProcedure({
    path: "group.getAll",
    kind: "query",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  }).handler(async ({ context }) => {
    const dbGroups = await context.db.query.groups.findMany({
      with: {
        members: {
          with: {
            user: {
              columns: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });
    return dbGroups.map((group) => ({ ...group, members: group.members.map((member) => member.user) }));
  });

  const selectable = authenticatedProcedure({
    path: "group.selectable",
    kind: "query",
    access: { kind: "protected" },
    demo: "guarded",
  })
    .input(z.object({ withPermissions: z.boolean().default(false) }).optional())
    .handler(async ({ context, input }) => {
      const withPermissions = input?.withPermissions && context.principal.user.permissions.includes("admin");
      if (!withPermissions) {
        return await context.db.query.groups.findMany({ columns: { id: true, name: true } });
      }
      const dbGroups = await context.db.query.groups.findMany({
        columns: { id: true, name: true },
        with: { permissions: { columns: { permission: true } } },
      });
      return dbGroups.map((group) => ({
        ...group,
        permissions: group.permissions.map((permission) => permission.permission),
      }));
    });

  async function throwIfGroupNotFoundAsync(db: Database, id: string) {
    const group = await db.query.groups.findFirst({ where: eq(resources.groups.id, id) });
    if (!group) throw new ORPCError("NOT_FOUND", { message: "Group not found" });
  }

  async function throwIfGroupNameIsReservedAsync(db: Database, id: string) {
    const count = await db.$count(
      resources.groups,
      and(eq(resources.groups.id, id), eq(resources.groups.name, everyoneGroup)),
    );
    if (count > 0) throw new ORPCError("FORBIDDEN", { message: "Action is forbidden for reserved group names" });
  }

  async function checkSimilarNameAndThrowAsync(db: Database, name: string, ignoreId?: string) {
    const similar = await db.query.groups.findFirst({
      where: and(like(resources.groups.name, `${name}`), not(eq(resources.groups.id, ignoreId ?? ""))),
    });
    if (similar) throw new ORPCError("CONFLICT", { message: "Found group with similar name" });
  }

  const updateGroup = authenticatedProcedure({
    path: "group.updateGroup",
    kind: "mutation",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  })
    .input(groupUpdateSchema)
    .handler(async ({ context, input }) => {
      await throwIfGroupNotFoundAsync(context.db, input.id);
      await throwIfGroupNameIsReservedAsync(context.db, input.id);
      await checkSimilarNameAndThrowAsync(context.db, input.name, input.id);
      await context.db.update(resources.groups).set({ name: input.name }).where(eq(resources.groups.id, input.id));
    });

  return { getAll, selectable, updateGroup };
}

export const portedGroupPaths = [
  "group.getAll",
  "group.getPaginated",
  "group.getById",
  "group.selectable",
  "group.search",
  "group.createGroup",
  "group.updateGroup",
  "group.savePartialSettings",
  "group.transferOwnership",
  "group.deleteGroup",
  "group.addMember",
  "group.removeMember",
] as const satisfies readonly SourceLeafPath[];

export const pendingGroupPaths = [
  "group.createInitialExternalGroup",
  "group.savePositions",
  "group.savePermissions",
] as const satisfies readonly SourceLeafPath[];

const adminQuery = (path: "group.getPaginated" | "group.getById" | "group.search") =>
  authenticatedProcedure({
    path,
    kind: "query",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  });
const adminMutation = (
  path:
    | "group.createGroup"
    | "group.savePartialSettings"
    | "group.transferOwnership"
    | "group.deleteGroup"
    | "group.addMember"
    | "group.removeMember",
) =>
  authenticatedProcedure({
    path,
    kind: "mutation",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  });

export function createGroupAdministrationProcedures(resources: GroupAdministrationResources) {
  const { eq, and, like, not, max } = resources.operators;

  async function throwIfGroupNotFoundAsync(db: Database, id: string) {
    const group = await db.query.groups.findFirst({ where: eq(resources.tables.groups.id, id) });
    if (!group) throw new ORPCError("NOT_FOUND", { message: "Group not found" });
  }

  async function throwIfGroupNameIsReservedAsync(db: Database, id: string) {
    const count = await db.$count(
      resources.tables.groups,
      and(eq(resources.tables.groups.id, id), eq(resources.tables.groups.name, everyoneGroup)),
    );
    if (count > 0) throw new ORPCError("FORBIDDEN", { message: "Action is forbidden for reserved group names" });
  }

  async function checkSimilarNameAndThrowAsync(db: Database, name: string, ignoreId?: string) {
    const similar = await db.query.groups.findFirst({
      where: and(like(resources.tables.groups.name, `${name}`), not(eq(resources.tables.groups.id, ignoreId ?? ""))),
    });
    if (similar) throw new ORPCError("CONFLICT", { message: "Found group with similar name" });
  }

  return {
    ...createGroupProcedures({ groups: resources.tables.groups, operators: resources.operators }),
    getPaginated: adminQuery("group.getPaginated")
      .input(paginatedSchema)
      .handler(async ({ context, input }) => {
        const where = input.search ? like(resources.tables.groups.name, `%${input.search.trim()}%`) : undefined;
        const totalCount = await context.db.$count(resources.tables.groups, where);
        const dbGroups = await context.db.query.groups.findMany({
          with: { members: { with: { user: { columns: { id: true, name: true, email: true, image: true } } } } },
          limit: input.pageSize,
          offset: (input.page - 1) * input.pageSize,
          where,
        });
        return {
          items: dbGroups.map((group) => ({ ...group, members: group.members.map((member) => member.user) })),
          totalCount,
        };
      }),
    getById: adminQuery("group.getById")
      .input(byIdSchema)
      .handler(async ({ context, input }) => {
        const group = await context.db.query.groups.findFirst({
          where: eq(resources.tables.groups.id, input.id),
          with: {
            members: {
              with: { user: { columns: { id: true, name: true, email: true, image: true, provider: true } } },
            },
            permissions: { columns: { permission: true } },
            owner: { columns: { id: true, name: true, image: true, email: true } },
          },
        });
        if (!group) throw new ORPCError("NOT_FOUND", { message: "Group not found" });
        return {
          ...group,
          members: group.members.map((member) => member.user),
          permissions: group.permissions.map((permission) => permission.permission),
        };
      }),
    search: adminQuery("group.search")
      .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
      .handler(async ({ context, input }) =>
        context.db.query.groups.findMany({
          where: like(resources.tables.groups.name, `%${input.query}%`),
          columns: { id: true, name: true },
          limit: input.limit,
        }),
      ),
    createGroup: adminMutation("group.createGroup")
      .input(groupCreateSchema)
      .handler(async ({ context, input }) => {
        await checkSimilarNameAndThrowAsync(context.db, input.name);
        const result = await context.db
          .select({ value: max(resources.tables.groups.position) })
          .from(resources.tables.groups);
        const maxPosition = result[0]?.value ?? 1;
        const id = resources.createId();
        await context.db
          .insert(resources.tables.groups)
          .values({ id, name: input.name, position: maxPosition + 1, ownerId: context.principal.user.id });
        return id;
      }),
    savePartialSettings: adminMutation("group.savePartialSettings")
      .input(groupSavePartialSettingsSchema)
      .handler(async ({ context, input }) => {
        await throwIfGroupNotFoundAsync(context.db, input.id);
        await context.db
          .update(resources.tables.groups)
          .set({ homeBoardId: input.settings.homeBoardId, mobileHomeBoardId: input.settings.mobileHomeBoardId })
          .where(eq(resources.tables.groups.id, input.id));
      }),
    transferOwnership: adminMutation("group.transferOwnership")
      .input(groupUserSchema)
      .handler(async ({ context, input }) => {
        await throwIfGroupNotFoundAsync(context.db, input.groupId);
        await throwIfGroupNameIsReservedAsync(context.db, input.groupId);
        await context.db
          .update(resources.tables.groups)
          .set({ ownerId: input.userId })
          .where(eq(resources.tables.groups.id, input.groupId));
      }),
    deleteGroup: adminMutation("group.deleteGroup")
      .input(byIdSchema)
      .handler(async ({ context, input }) => {
        await throwIfGroupNotFoundAsync(context.db, input.id);
        await throwIfGroupNameIsReservedAsync(context.db, input.id);
        await context.db.delete(resources.tables.groups).where(eq(resources.tables.groups.id, input.id));
      }),
    addMember: adminMutation("group.addMember")
      .input(groupUserSchema)
      .handler(async ({ context, input }) => {
        await throwIfGroupNotFoundAsync(context.db, input.groupId);
        await throwIfGroupNameIsReservedAsync(context.db, input.groupId);
        throwIfGroupMembersCannotBeManagedLocally(resources);
        const user = await context.db.query.users.findFirst({ where: eq(resources.tables.users.id, input.userId) });
        if (!user) throw new ORPCError("NOT_FOUND", { message: "User not found" });
        if (!isGroupMembershipManagedLocally(user.provider, resources.providers()))
          throw new ORPCError("FORBIDDEN", { message: "User's provider is not managed locally" });
        await context.db.insert(resources.tables.groupMembers).values({ groupId: input.groupId, userId: input.userId });
      }),
    removeMember: adminMutation("group.removeMember")
      .input(groupUserSchema)
      .handler(async ({ context, input }) => {
        await throwIfGroupNotFoundAsync(context.db, input.groupId);
        await throwIfGroupNameIsReservedAsync(context.db, input.groupId);
        throwIfGroupMembersCannotBeManagedLocally(resources);
        await context.db
          .delete(resources.tables.groupMembers)
          .where(
            and(
              eq(resources.tables.groupMembers.groupId, input.groupId),
              eq(resources.tables.groupMembers.userId, input.userId),
            ),
          );
      }),
  };
}
