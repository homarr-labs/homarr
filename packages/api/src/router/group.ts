import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { canManageGroupMembersLocally, isGroupMembershipManagedLocally } from "@homarr/auth/server";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync, inArray, like, not } from "@homarr/db";
import { getMaxGroupPositionAsync } from "@homarr/db/queries";
import { boards, groupMembers, groupPermissions, groups, onboarding, users } from "@homarr/db/schema";
import { selectGroupSchema, selectUserSchema } from "@homarr/db/validationSchemas";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { everyoneGroup, groupPermissionKeys, supportedAuthProviders } from "@homarr/definitions";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";
import { zodEnumFromArray } from "@homarr/validation/enums";
import {
  groupCreateSchema,
  groupSaveMembersSchema,
  groupSavePartialSettingsSchema,
  groupSavePermissionsSchema,
  groupSavePositionsSchema,
  groupUpdateSchema,
  groupUserSchema,
} from "@homarr/validation/group";

import { createTRPCRouter, onboardingProcedure, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const groupPermissionKeySchema = zodEnumFromArray(groupPermissionKeys);

export const groupRouter = createTRPCRouter({
  getAll: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.void())
    .output(
      z.array(
        selectGroupSchema.extend({
          members: z.array(selectUserSchema.pick({ id: true, name: true, email: true, image: true })),
          permissions: z.array(groupPermissionKeySchema),
        }),
      ),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/groups",
        tags: ["groups"],
        protect: true,
        summary: "List all groups",
        description: `Return every group with its position, home boards, owner ID, permissions, and members. A lower position takes precedence when resolving home boards. The reserved group named '${everyoneGroup}' is joined by every user on sign-in, is not part of the group order, and cannot be renamed, deleted, or have its members changed. Requires admin permission.`,
      },
    })
    .query(async ({ ctx }) => {
      const dbGroups = await ctx.db.query.groups.findMany({
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
          permissions: {
            columns: {
              permission: true,
            },
          },
        },
      });

      return dbGroups.map((group) => ({
        ...group,
        members: group.members.map((member) => member.user),
        permissions: group.permissions.map((permission) => permission.permission),
      }));
    }),

  getPaginated: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(paginatedSchema)
    .query(async ({ input, ctx }) => {
      const whereQuery = input.search ? like(groups.name, `%${input.search.trim()}%`) : undefined;
      const groupCount = await ctx.db.$count(groups, whereQuery);

      const dbGroups = await ctx.db.query.groups.findMany({
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
    .output(
      selectGroupSchema.extend({
        members: z.array(
          selectUserSchema
            .pick({ id: true, name: true, email: true, image: true })
            .extend({ provider: z.enum(supportedAuthProviders), isMembershipManagedLocally: z.boolean() }),
        ),
        permissions: z.array(groupPermissionKeySchema),
        owner: selectUserSchema.pick({ id: true, name: true, image: true, email: true }).nullable(),
      }),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/groups/{id}",
        tags: ["groups"],
        protect: true,
        summary: "Get a group",
        description:
          "Return a group with its position, home boards, owner, permissions, and members, including each member's authentication provider and whether the membership is managed locally. Memberships synchronized from an external provider (LDAP, or OIDC without local group management) cannot be changed. Requires admin permission.",
      },
    })
    .query(async ({ input, ctx }) => {
      const group = await ctx.db.query.groups.findFirst({
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return {
        ...group,
        members: group.members.map((member) => ({
          ...member.user,
          isMembershipManagedLocally: isGroupMembershipManagedLocally(member.user.provider),
        })),
        permissions: group.permissions.map((permission) => permission.permission),
      };
    }),
  // Is protected because also used in board access / integration access forms
  selectable: protectedProcedure
    .input(z.object({ withPermissions: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const withPermissions = input?.withPermissions && ctx.session.user.permissions.includes("admin");

      if (!withPermissions) {
        return await ctx.db.query.groups.findMany({
          columns: {
            id: true,
            name: true,
          },
        });
      }

      const groups = await ctx.db.query.groups.findMany({
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
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.groups.findMany({
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
    .mutation(async ({ input, ctx }) => {
      await checkSimilarNameAndThrowAsync(ctx.db, input.name);

      const maxPosition = await getMaxGroupPositionAsync(ctx.db);

      const groupId = createId();
      const groupRow = {
        id: groupId,
        name: input.name,
        position: maxPosition + 1,
      };

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            const transitionResult = await transaction
              .update(schema.onboarding)
              .set({ previousStep: "group", step: "setup" })
              .where(eq(schema.onboarding.step, "group"));
            const transitionedRows = transitionResult.rowCount ?? 0;
            if (transitionedRows !== 1) {
              throw new TRPCError({ code: "CONFLICT", message: "The initial external group was already created." });
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
              throw new TRPCError({ code: "CONFLICT", message: "The initial external group was already created." });
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
    .output(z.object({ id: z.string() }))
    .meta({
      openapi: {
        method: "POST",
        path: "/api/groups",
        tags: ["groups"],
        protect: true,
        summary: "Create a group",
        description: `Create a group without permissions or members at the end of the group order and return its ID. The name must be unique and cannot be '${everyoneGroup}'. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await checkSimilarNameAndThrowAsync(ctx.db, input.name);

      const maxPosition = await getMaxGroupPositionAsync(ctx.db);

      const id = createId();
      await ctx.db.insert(groups).values({
        id,
        name: input.name,
        position: maxPosition + 1,
        ownerId: ctx.session.user.id,
      });

      return { id };
    }),
  updateGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUpdateSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/groups/{id}",
        tags: ["groups"],
        protect: true,
        summary: "Rename a group",
        description: `Change a group's name. The name must be unique and the '${everyoneGroup}' group cannot be renamed. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.id);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.id);

      await checkSimilarNameAndThrowAsync(ctx.db, input.name, input.id);

      await ctx.db
        .update(groups)
        .set({
          name: input.name,
        })
        .where(eq(groups.id, input.id));
    }),
  savePartialSettings: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSavePartialSettingsSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/groups/{id}/settings",
        tags: ["groups"],
        protect: true,
        summary: "Update group home boards",
        description: `Set or clear a group's desktop and mobile home boards. Omitted values remain unchanged and null clears a home board. Each board must exist; whether the group's members can view it is not checked. Also allowed for the '${everyoneGroup}' group. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.id);
      await throwIfBoardsNotFoundAsync(
        ctx.db,
        [input.homeBoardId, input.mobileHomeBoardId].filter((boardId) => typeof boardId === "string"),
      );

      if (input.homeBoardId === undefined && input.mobileHomeBoardId === undefined) return;

      await ctx.db
        .update(groups)
        .set({
          homeBoardId: input.homeBoardId,
          mobileHomeBoardId: input.mobileHomeBoardId,
        })
        .where(eq(groups.id, input.id));
    }),
  savePositions: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSavePositionsSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/groups/positions",
        tags: ["groups"],
        protect: true,
        summary: "Reorder groups",
        description: `Set the order of all groups; the first group gets the lowest position and takes precedence when resolving home boards. List every group except '${everyoneGroup}' exactly once. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupPositionsIncompleteAsync(ctx.db, input.positions);

      const positions = input.positions.map((id, index) => ({ id, position: index + 1 }));

      await handleTransactionsAsync(ctx.db, {
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
    .output(z.object({ permissions: z.array(groupPermissionKeySchema) }))
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/groups/{groupId}/permissions",
        tags: ["groups"],
        protect: true,
        summary: "Replace group permissions",
        description: `Replace all permissions of a group and return the stored permissions. Omitted permissions are removed; implied permissions are not added. Also allowed for the '${everyoneGroup}' group. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.groupId);

      // Stored exactly as selected - implied permissions are resolved at read time through
      // getPermissionsWithChildren, so nothing is silently escalated here.
      const permissions = [...new Set(input.permissions)];

      await handleTransactionsAsync(ctx.db, {
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

      return { permissions };
    }),
  transferOwnership: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.groupId);

      await ctx.db
        .update(groups)
        .set({
          ownerId: input.userId,
        })
        .where(eq(groups.id, input.groupId));
    }),
  deleteGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(byIdSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/groups/{id}",
        tags: ["groups"],
        protect: true,
        summary: "Delete a group",
        description: `Delete a group with its permissions and memberships. The '${everyoneGroup}' group cannot be deleted. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.id);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.id);

      await ctx.db.delete(groups).where(eq(groups.id, input.id));
    }),
  saveMembers: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupSaveMembersSchema)
    .output(z.object({ userIds: z.array(z.string()) }))
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/groups/{groupId}/members",
        tags: ["groups"],
        protect: true,
        summary: "Replace group members",
        description: `Replace the members of a group and return the resulting member IDs. Every user must exist and omitted members are removed. Users whose groups are synchronized from an external provider (LDAP, or OIDC without local group management) cannot be added or removed, so members with isMembershipManagedLocally set to false in GET /api/groups/{id} must stay listed. Not allowed for the '${everyoneGroup}' group. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.groupId);
      throwIfGroupMembersCannotBeManagedLocally();

      const userIds = [...new Set(input.userIds)];
      const dbUsers = await getUsersOrThrowAsync(ctx.db, userIds);
      const currentMembers = await ctx.db.query.groupMembers.findMany({
        columns: {
          userId: true,
        },
        with: {
          user: {
            columns: {
              id: true,
              provider: true,
            },
          },
        },
        where: eq(groupMembers.groupId, input.groupId),
      });

      const currentMemberIds = new Set(currentMembers.map((member) => member.userId));
      const addedUsers = dbUsers.filter((user) => !currentMemberIds.has(user.id));
      const removedUsers = currentMembers.map((member) => member.user).filter((user) => !userIds.includes(user.id));
      throwIfUserMembershipsNotManagedLocally([...addedUsers, ...removedUsers]);

      const addedMemberRows = addedUsers.map((user) => ({ groupId: input.groupId, userId: user.id }));
      const removedUserIds = removedUsers.map((user) => user.id);

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            if (removedUserIds.length > 0) {
              await transaction
                .delete(schema.groupMembers)
                .where(
                  and(
                    eq(schema.groupMembers.groupId, input.groupId),
                    inArray(schema.groupMembers.userId, removedUserIds),
                  ),
                );
            }
            if (addedMemberRows.length > 0) {
              await transaction.insert(schema.groupMembers).values(addedMemberRows).onConflictDoNothing();
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            if (removedUserIds.length > 0) {
              transaction
                .delete(groupMembers)
                .where(and(eq(groupMembers.groupId, input.groupId), inArray(groupMembers.userId, removedUserIds)))
                .run();
            }
            if (addedMemberRows.length > 0) {
              transaction.insert(groupMembers).values(addedMemberRows).onConflictDoNothing().run();
            }
          });
        },
      });

      const members = await ctx.db.query.groupMembers.findMany({
        columns: {
          userId: true,
        },
        where: eq(groupMembers.groupId, input.groupId),
      });

      return { userIds: members.map((member) => member.userId) };
    }),
  addMember: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "POST",
        path: "/api/groups/{groupId}/members/{userId}",
        tags: ["groups"],
        protect: true,
        summary: "Add a group member",
        description: `Add a user to a group. Adding an existing member has no effect. Users whose groups are synchronized from an external provider (LDAP, or OIDC without local group management) cannot be added. Not allowed for the '${everyoneGroup}' group. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.groupId);
      throwIfGroupMembersCannotBeManagedLocally();
      throwIfUserMembershipsNotManagedLocally(await getUsersOrThrowAsync(ctx.db, [input.userId]));

      await ctx.db
        .insert(groupMembers)
        .values({
          groupId: input.groupId,
          userId: input.userId,
        })
        .onConflictDoNothing();
    }),
  removeMember: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(groupUserSchema)
    .output(z.void())
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/groups/{groupId}/members/{userId}",
        tags: ["groups"],
        protect: true,
        summary: "Remove a group member",
        description: `Remove a user from a group. Removing a user who is not a member has no effect. Users whose groups are synchronized from an external provider (LDAP, or OIDC without local group management) cannot be removed. Not allowed for the '${everyoneGroup}' group. Requires admin permission.`,
      },
    })
    .mutation(async ({ input, ctx }) => {
      await throwIfGroupNotFoundAsync(ctx.db, input.groupId);
      await throwIfGroupNameIsReservedAsync(ctx.db, input.groupId);
      throwIfGroupMembersCannotBeManagedLocally();
      throwIfUserMembershipsNotManagedLocally(await getUsersOrThrowAsync(ctx.db, [input.userId]));

      await ctx.db
        .delete(groupMembers)
        .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)));
    }),
});

const checkSimilarNameAndThrowAsync = async (db: Database, name: string, ignoreId?: string) => {
  const similar = await db.query.groups.findFirst({
    where: and(like(groups.name, `${name}`), not(eq(groups.id, ignoreId ?? ""))),
  });

  if (similar) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Found group with similar name",
    });
  }
};

const throwIfGroupNameIsReservedAsync = async (db: Database, id: string) => {
  const count = await db.$count(groups, and(eq(groups.id, id), eq(groups.name, everyoneGroup)));

  if (count > 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Action is forbidden for reserved group names",
    });
  }
};

const throwIfGroupMembersCannotBeManagedLocally = () => {
  if (!canManageGroupMembersLocally()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Group members cannot be managed locally",
    });
  }
};

const getUsersOrThrowAsync = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) return [];

  const dbUsers = await db.query.users.findMany({
    columns: {
      id: true,
      provider: true,
    },
    where: inArray(users.id, userIds),
  });

  if (dbUsers.length !== userIds.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  return dbUsers;
};

const throwIfUserMembershipsNotManagedLocally = (dbUsers: { provider: SupportedAuthProvider }[]) => {
  if (dbUsers.some((user) => !isGroupMembershipManagedLocally(user.provider))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User's provider is not managed locally",
    });
  }
};

const throwIfBoardsNotFoundAsync = async (db: Database, boardIds: string[]) => {
  if (boardIds.length === 0) return;

  const dbBoards = await db.query.boards.findMany({
    columns: {
      id: true,
    },
    where: inArray(boards.id, boardIds),
  });
  const dbBoardIds = new Set(dbBoards.map((board) => board.id));

  if (boardIds.some((boardId) => !dbBoardIds.has(boardId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Board not found",
    });
  }
};

const throwIfGroupPositionsIncompleteAsync = async (db: Database, groupIds: string[]) => {
  if (new Set(groupIds).size !== groupIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Group IDs must be unique",
    });
  }

  const dbGroups = await db.query.groups.findMany({
    columns: {
      id: true,
      name: true,
    },
  });
  const dbGroupIds = new Set(dbGroups.map((group) => group.id));

  if (groupIds.some((groupId) => !dbGroupIds.has(groupId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }

  // The everyone group is the last fallback for home boards and therefore not part of the order
  const dbEveryoneGroup = dbGroups.find((group) => group.name === everyoneGroup);
  if (dbEveryoneGroup && groupIds.includes(dbEveryoneGroup.id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Action is forbidden for reserved group names",
    });
  }

  if (groupIds.length !== dbGroups.filter((group) => group.name !== everyoneGroup).length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Positions must include every group",
    });
  }
};

const throwIfGroupNotFoundAsync = async (db: Database, id: string) => {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, id),
  });

  if (!group) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Group not found",
    });
  }
};
