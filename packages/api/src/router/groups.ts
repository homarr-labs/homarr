import { TRPCError } from "@trpc/server";

import { and, createId, eq, like, sql } from "@homarr/db";
import {
  groupMembers,
  groupPermissions,
  groups,
} from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const groupRouter = createTRPCRouter({
  paginated: protectedProcedure
    .input(validation.group.paginated)
    .query(async ({ input, ctx }) => {
      const whereQuery = input.search
        ? like(groups.name, `%${input.search.trim()}%`)
        : undefined;
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
        totalCount: groupCount[0]!.count,
      };
    }),
  byId: protectedProcedure
    .input(validation.group.byId)
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
        permissions: group.permissions.map(
          (permission) => permission.permission,
        ),
      };
    }),
  create: protectedProcedure
    .input(validation.group.create)
    .mutation(async ({ input, ctx }) => {
      const id = createId();
      await ctx.db.insert(groups).values({
        id,
        name: input.name,
        creatorId: ctx.session.user.id,
      });

      return id;
    }),
  update: protectedProcedure
    .input(validation.group.update)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(groups)
        .set({
          name: input.name,
        })
        .where(eq(groups.id, input.id));
    }),
  savePermissions: protectedProcedure
    .input(validation.group.savePermissions)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(groupPermissions)
        .where(eq(groupPermissions.groupId, input.groupId));
      await ctx.db.insert(groupPermissions).values(
        input.permissions.map((permission) => ({
          groupId: input.groupId,
          permission,
        })),
      );
    }),
  transferOwnership: protectedProcedure
    .input(validation.group.groupUser)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(groups)
        .set({
          creatorId: input.userId,
        })
        .where(eq(groups.id, input.groupId));
    }),
  delete: protectedProcedure
    .input(validation.group.byId)
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(groups).where(eq(groups.id, input.id));
    }),
  addMember: protectedProcedure
    .input(validation.group.groupUser)
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.db.query.groups.findFirst({
        where: eq(groups.id, input.groupId),
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

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
  removeMember: protectedProcedure
    .input(validation.group.groupUser)
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, input.userId),
          ),
        );
    }),
});
