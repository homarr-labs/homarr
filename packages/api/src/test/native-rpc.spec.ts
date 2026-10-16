import { ORPCError } from "@orpc/server";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";

import {
  ApiError,
  ApiProcedureBuilder,
  createApiCaller,
  createApiContext,
  createApiRouter,
  permissionRequiredProcedure,
  protectedProcedure,
} from "../procedure";
import { observable, subscriptionEvents } from "../subscription";

const anonymousContext = () => createApiContext({ headers: new Headers({ host: "localhost" }), session: null });
const session: Session = {
  expires: "2099-01-01T00:00:00.000Z",
  user: { id: "native-guard-user", permissions: [], colorScheme: "dark" },
};

describe("native API execution", () => {
  test("enforces authentication and permissions before calling the handler", async () => {
    const handler = vi.fn(() => "secret");
    const router = createApiRouter({
      protected: protectedProcedure.query(handler),
      admin: permissionRequiredProcedure.requiresPermission("admin").query(handler),
    });
    const context = anonymousContext();
    await expect(createApiCaller(router, context).protected()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(createApiCaller(router, { ...context, session }).admin()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(handler).not.toHaveBeenCalled();
    const adminSession = { ...session, user: { ...session.user, permissions: ["admin" as const] } };
    expect(await createApiCaller(router, { ...context, session: adminSession }).admin()).toBe("secret");
    expect(handler).toHaveBeenCalledOnce();
  });

  test("composes validated inputs and authorized context in middleware order", async () => {
    const base = new ApiProcedureBuilder();
    const order: string[] = [];
    const first = base.input(z.object({ title: z.string().trim() })).use(({ next }, input) => {
      expect(input.title).toBe("title");
      order.push("first");
      return next({ context: { granted: "first" as const } });
    });
    const second = base.input(z.object({ page: z.coerce.number().int().positive() })).use(({ next }, input) => {
      expect(input.page).toBe(2);
      order.push("second");
      return next({ context: { owner: "second" } });
    });
    const procedure = first
      .concat(second)
      .input(z.object({ limit: z.number().default(10) }))
      .query(({ context, input }) => {
        order.push("handler");
        return { granted: context.granted, owner: context.owner, ...input };
      });
    const caller = createApiCaller({ procedure }, anonymousContext());
    expect(await caller.procedure({ title: " title ", page: "2" })).toEqual({
      title: "title",
      page: 2,
      limit: 10,
      granted: "first",
      owner: "second",
    });
    expect(order).toEqual(["first", "second", "handler"]);
    await expect(caller.procedure({ title: "title", page: "invalid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  test("validates output and serializes native domain errors", async () => {
    const base = new ApiProcedureBuilder();
    const router = {
      output: base.output(z.object({ safe: z.string() })).query(() => ({ safe: "visible", secret: "stripped" })),
      error: base.query(() => {
        throw new ApiError({ code: "FORBIDDEN", message: "Permission denied" });
      }),
    };
    const caller = createApiCaller(router, anonymousContext());
    expect(await caller.output()).toEqual({ safe: "visible" });
    await expect(caller.error()).rejects.toBeInstanceOf(ORPCError);
    await expect(caller.error()).rejects.toMatchObject({ code: "FORBIDDEN", message: "Permission denied" });
  });

  test("cancels callback subscriptions and releases listeners exactly once", async () => {
    const cleanup = vi.fn();
    const source = observable<number>((observer) => {
      observer.next(1);
      return cleanup;
    });
    const procedure = new ApiProcedureBuilder().subscription(({ signal }) => subscriptionEvents(source, signal));
    const abort = new AbortController();
    const stream = await createApiCaller({ procedure }, anonymousContext()).procedure(undefined, {
      signal: abort.signal,
    });
    expect(await stream.next()).toEqual({ done: false, value: 1 });
    abort.abort();
    expect(await stream.next()).toEqual({ done: true, value: undefined });
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
