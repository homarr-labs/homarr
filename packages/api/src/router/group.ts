import { TRPCError } from "@trpc/server";

import type { Database } from "@homarr/db";
import { and, createId, eq, like, not, sql } from "@homarr/db";
import { groupMembers, groupPermissions, groups } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const groupRouter = createTRPCRouter({
  getPaginated: protectedProcedure.input(validation.common.paginated).query(async ({ input, ctx }) => {
    const whereQuery = input.search ? like(groups.name, `%${input.search.trim()}%`) : undefined;
    const groupCount = await ctx.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(groups)
      .where(whereQuery);

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
      totalCount: groupCount[0]?.count ?? 0,
    };
  }),
  getById: protectedProcedure.input(validation.common.byId).query(async ({ input, ctx }) => {
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
      members: group.members.map((member) => member.user),
      permissions: group.permissions.map((permission) => permission.permission),
    };
  }),
  selectable: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.groups.findMany({
      columns: {
        id: true,
        name: true,
      },
    });
  }),
  search: publicProcedure
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
  createGroup: protectedProcedure.input(validation.group.create).mutation(async ({ input, ctx }) => {
    const normalizedName = normalizeName(input.name);
    await checkSimilarNameAndThrowAsync(ctx.db, normalizedName);

    const id = createId();
    await ctx.db.insert(groups).values({
      id,
      name: normalizedName,
      ownerId: ctx.session.user.id,
    });

    return id;
  }),
  updateGroup: protectedProcedure.input(validation.group.update).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.id);

    const normalizedName = normalizeName(input.name);
    await checkSimilarNameAndThrowAsync(ctx.db, normalizedName, input.id);

    await ctx.db
      .update(groups)
      .set({
        name: normalizedName,
      })
      .where(eq(groups.id, input.id));
  }),
  savePermissions: protectedProcedure.input(validation.group.savePermissions).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.groupId);

    await ctx.db.delete(groupPermissions).where(eq(groupPermissions.groupId, input.groupId));

    await ctx.db.insert(groupPermissions).values(
      input.permissions.map((permission) => ({
        groupId: input.groupId,
        permission,
      })),
    );
  }),
  transferOwnership: protectedProcedure.input(validation.group.groupUser).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.groupId);

    await ctx.db
      .update(groups)
      .set({
        ownerId: input.userId,
      })
      .where(eq(groups.id, input.groupId));
  }),
  deleteGroup: protectedProcedure.input(validation.common.byId).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.id);

    await ctx.db.delete(groups).where(eq(groups.id, input.id));
  }),
  addMember: protectedProcedure.input(validation.group.groupUser).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.groupId);

    const user = await ctx.db.query.users.findFirst({
      where: eq(groups.id, input.userId),
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.insert(groupMembers).values({
      groupId: input.groupId,
      userId: input.userId,
    });
  }),
  removeMember: protectedProcedure.input(validation.group.groupUser).mutation(async ({ input, ctx }) => {
    await throwIfGroupNotFoundAsync(ctx.db, input.groupId);

    await ctx.db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)));
  }),
});

const normalizeName = (name: string) => name.trim();

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
