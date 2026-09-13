import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { resolvePackagePlacement } from "./records";
import { resolvePackagePreview } from "./preview-store";
import type { PackageContext } from "./types";

export async function widgetArtifactResponse(
  ctx: PackageContext,
  input: {
    itemId?: string;
    digest?: string;
    previewId?: string;
    surface: string;
    css: boolean;
  },
) {
  try {
    const surface = z.enum(["tile", "advanced", "configuration"]).parse(input.surface);
    const resolved = input.previewId
      ? await resolvePackagePreview(ctx, input.previewId)
      : await resolvePackagePlacement(ctx, input.itemId ?? "");
    if (!input.previewId && resolved.artifact.digest !== input.digest) throw new TRPCError({ code: "NOT_FOUND" });
    const entry = resolved.artifact.client[surface];
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
    let content = entry.css;
    if (resolved.artifact.manifest.styles !== "global") {
      content = `@scope ([data-custom-widget-artifact="${resolved.artifact.digest}"]) {\n${content}\n}`;
    }
    let contentType = "text/css; charset=utf-8";
    if (!input.css) {
      contentType = "text/javascript; charset=utf-8";
      content = `const registry=globalThis[Symbol.for('homarr.widget.modules.v1')];\nawait registry.prepare(${JSON.stringify(entry.hostModules)});\nconst require=registry.require;\nconst module={exports:{}};\nconst exports=module.exports;\n${entry.javascript}\nexport default module.exports.default ?? module.exports;\n`;
    }
    return new Response(content, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  } catch (error) {
    let status = 500;
    if (error instanceof z.ZodError) status = 400;
    if (error instanceof TRPCError) {
      if (error.code === "NOT_FOUND") status = 404;
      if (error.code === "UNAUTHORIZED") status = 401;
      if (error.code === "FORBIDDEN") status = 403;
      if (error.code === "PRECONDITION_FAILED") status = 412;
    }
    return new Response("Widget artifact unavailable", { status, headers: { "cache-control": "no-store" } });
  }
}
