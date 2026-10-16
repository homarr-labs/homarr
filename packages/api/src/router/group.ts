import { ApiError } from "../procedure";
import { z } from "zod/v4";

import { canManageGroupMembersLocally, isGroupMembershipManagedLocally } from "@homarr/auth/server";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync, like, not } from "@homarr/db";
import { getMaxGroupPositionAsync } from "@homarr/db/queries";
import { groupMembers, groupPermissions, groups, onboarding, users } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";
import {
  groupCreateSchema,
  groupSavePartialSettingsSchema,
  groupSavePermissionsSchema,
  groupSavePositionsSchema,
  groupUpdateSchema,
  groupUserSchema,
} from "@homarr/validation/group";

import { createApiRouter, onboardingProcedure, permissionRequiredProcedure, protectedProcedure } from "../procedure";

export const groupRouter = createApiRouter({
  getAll: permissionRequiredProcedure.requiresPermission("admin").query(async ({ context }) => {
    const dbGroups = await context.db.query.groups.findMany({
      with: {
        members: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return dbGroups.map((group) => ({
      ...group,
      members: group.members.map((member) => member.user),
    }));
  }),

  getPaginated: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(paginatedSchema)
    .query(async ({ input, context }) => {
      const whereQuery = input.search ? like(groups.name, `%${input.search.trim()}%`) : undefined;
      const groupCount = await context.db.$count(groups, whereQuery);

      const dbGroups = await context.db.query.groups.findMany({
        with: {
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        where: whereQuery,
      });

      return {
        items: dbGroups.map((group) => ({
          ...group,
          members: group.members.map((member) => member.user),
        })),
        totalCount: groupCount,
      };
    }),
  getById: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(byIdSchema)
    .query(async ({ input, context }) => {
      const group = await context.db.query.groups.findFirst({
        where: eq(groups.id, input.id),
        with: {
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  provider: true,
                },
              },
            },
          },
          permissions: {
            columns: {
              permission: true,
            },
          },
          owner: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
      });

      if (!group) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return {
        ...group,
        members: group.members.map((member) => member.user),
        permissions: group.permissions.map((permission) => permission.permission),
      };
    }),
  // Is protected because also used in board access / integration access forms
  selectable: protectedProcedure
    .input(z.object({ withPermissions: z.boolean().default(false) }).optional())
    .query(async ({ context, input }) => {
      const withPermissions = input?.withPermissions && context.session.user.permissions.includes("admin");

      if (!withPermissions) {
        return await context.db.query.groups.findMany({
          columns: {
            id: true,
            name: true,
          },
        });
      }

      const groups = await context.db.query.groups.findMany({
        columns: {
          id: true,
          name: true,
        },
        with: { permissions: { columns: { permission: true } } },
      });

      return groups.map((group) => ({
        ...group,
        permissions: group.permissions.map((permission) => permission.permission),
      }));
    }),
  search: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input, context }) => {
      return await context.db.query.groups.findMany({
        where: like(groups.name, `%${input.query}%`),
        columns: {
          id: true,
          name: true,
        },
        limit: input.limit,
      });
    }),
  createInitialExternalGroup: onboardingProcedure
    .requiresStep("group")
    .input(groupCreateSchema)
    .mutation(async ({ input, context }) => {
      await checkSimilarNameAndThrowAsync(context.db, input.name);

      const maxPosition = await getMaxGroupPositionAsync(context.db);

      const groupId = createId();
      const groupRow = {
        id: groupId,
        name: input.name,
        position: maxPosition + 1,
      };

      await handleTransactionsAsync(context.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            const transitionResult = await transaction
              .update(schema.onboarding)
              .set({ previousStep: "group", step: "setup" })
              .where(eq(schema.onboarding.step, "group"));
            const transitionedRows = transitionResult.rowCount ?? 0;
            if (transitionedRows !== 1) {
              throw new ApiError({ code: "CONFLICT", message: "The initial external group was already created." });
            }
            await transaction.insert(schema.groups).values(groupRow);
            await transaction.insert(schema.groupPermissions).values({ groupId, permission: "admin" });
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            const transitionResult = transaction
              .update(onboarding)
              .set({ previousStep: "group", step: "setup" })
              .where(eq(onboarding.step, "group"))
              .run();
            if (transitionResult.changes !== 1) {
              throw new ApiError({ code: "CONFLICT", message: "The initial external group was already created." });
            }
            transaction.insert(groups).values(groupRow).run();
            transaction.insert(groupPermissions).values({ groupId, permission: "admin" }).run();
          });
        },
      });
    }),
  createGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupCreateSchema)
    .mutation(async ({ input, context }) => {
      await checkSimilarNameAndThrowAsync(context.db, input.name);

      const maxPosition = await getMaxGroupPositionAsync(context.db);

      const id = createId();
      await context.db.insert(groups).values({
        id,
        name: input.name,
        position: maxPosition + 1,
        ownerId: context.session.user.id,
      });

      return id;
    }),
  updateGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUpdateSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.id);
      await throwIfGroupNameIsReservedAsync(context.db, input.id);

      await checkSimilarNameAndThrowAsync(context.db, input.name, input.id);

      await context.db
        .update(groups)
        .set({
          name: input.name,
        })
        .where(eq(groups.id, input.id));
    }),
  savePartialSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSavePartialSettingsSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.id);

      await context.db
        .update(groups)
        .set({
          homeBoardId: input.settings.homeBoardId,
          mobileHomeBoardId: input.settings.mobileHomeBoardId,
        })
        .where(eq(groups.id, input.id));
    }),
  savePositions: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSavePositionsSchema)
    .mutation(async ({ input, context }) => {
      const positions = input.positions.map((id, index) => ({ id, position: index + 1 }));

      await handleTransactionsAsync(context.db, {
        handleAsync: async (db, schema) => {
          await db.transaction(async (trx) => {
            for (const { id, position } of positions) {
              await trx.update(schema.groups).set({ position }).where(eq(groups.id, id));
            }
          });
        },
        handleSync: (db) => {
          db.transaction((trx) => {
            for (const { id, position } of positions) {
              trx.update(groups).set({ position }).where(eq(groups.id, id)).run();
            }
          });
        },
      });
    }),
  savePermissions: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSavePermissionsSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.groupId);

      // Stored exactly as selected - implied permissions are resolved at read time through
      // getPermissionsWithChildren, so nothing is silently escalated here.
      const permissions = [...new Set(input.permissions)];

      await handleTransactionsAsync(context.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction.delete(schema.groupPermissions).where(eq(schema.groupPermissions.groupId, input.groupId));
            if (permissions.length === 0) {
              return;
            }
            await transaction.insert(schema.groupPermissions).values(
              permissions.map((permission) => ({
                groupId: input.groupId,
                permission,
              })),
            );
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction.delete(groupPermissions).where(eq(groupPermissions.groupId, input.groupId)).run();
            if (permissions.length === 0) {
              return;
            }
            transaction
              .insert(groupPermissions)
              .values(
                permissions.map((permission) => ({
                  groupId: input.groupId,
                  permission,
                })),
              )
              .run();
          });
        },
      });
    }),
  transferOwnership: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(context.db, input.groupId);

      await context.db
        .update(groups)
        .set({
          ownerId: input.userId,
        })
        .where(eq(groups.id, input.groupId));
    }),
  deleteGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(byIdSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.id);
      await throwIfGroupNameIsReservedAsync(context.db, input.id);

      await context.db.delete(groups).where(eq(groups.id, input.id));
    }),
  addMember: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(context.db, input.groupId);
      throwIfGroupMembersCannotBeManagedLocally();

      const user = await context.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (!isGroupMembershipManagedLocally(user.provider)) {
        throw new ApiError({
          code: "FORBIDDEN",
          message: "User's provider is not managed locally",
        });
      }

      await context.db.insert(groupMembers).values({
        groupId: input.groupId,
        userId: input.userId,
      });
    }),
  removeMember: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .mutation(async ({ input, context }) => {
      await throwIfGroupNotFoundAsync(context.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(context.db, input.groupId);
      throwIfGroupMembersCannotBeManagedLocally();

      await context.db
        .delete(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)));
    }),
});

const checkSimilarNameAndThrowAsync = async (db: Database, name: string, ignoreId?: string) => {
  const similar = await db.query.groups.findFirst({
    where: and(like(groups.name, `${name}`), not(eq(groups.id, ignoreId ?? ""))),
  });

  if (similar) {
    throw new ApiError({
      code: "CONFLICT",
      message: "Found group with similar name",
    });
  }
};

const throwIfGroupNameIsReservedAsync = async (db: Database, id: string) => {
  const count = await db.$count(groups, and(eq(groups.id, id), eq(groups.name, everyoneGroup)));

  if (count > 0) {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Action is forbidden for reserved group names",
    });
  }
};

const throwIfGroupMembersCannotBeManagedLocally = () => {
  if (!canManageGroupMembersLocally()) {
    throw new ApiError({
      code: "FORBIDDEN",
      message: "Group members cannot be managed locally",
    });
  }
};

const throwIfGroupNotFoundAsync = async (db: Database, id: string) => {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!group) {
    throw new ApiError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
};
