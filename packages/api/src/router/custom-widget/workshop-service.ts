import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { WorkshopBackend } from "@homarr/workshop/backend";
import {
  isSupportedWorkshopWidgetSchema,
  resolveHomarrUrlConfig,
  validateWorkshopWidget,
} from "@homarr/workshop/schema";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { toPortableCustomWidgetDefinition } from "@homarr/custom-widgets/core";
import { env } from "../../env";

const logger = createLogger({ module: "custom-widget:workshop" });

export const workshopUrls = resolveHomarrUrlConfig({
  homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
  workshopApiUrl: env.WORKSHOP_API_URL,
  workshopWebUrl: env.WORKSHOP_WEB_URL,
});
export const workshop = new WorkshopBackend(workshopUrls.workshopApiUrl);
export const getWorkshopSubmissionUrl = (id: string) => `${workshopUrls.workshopWebUrl}/${encodeURIComponent(id)}`;

export async function getWorkshopWidget(submissionId: string) {
  try {
    const submission = await workshop.get(submissionId);
    if (submission.type !== "customWidget" || !isSupportedWorkshopWidgetSchema(submission.widgetSchema)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Incompatible Workshop widget" });
    }
    const validation = validateWorkshopWidget(submission.content);
    if (!validation.success) throw new TRPCError({ code: "BAD_REQUEST", message: validation.error });
    if (validation.data.$schema !== submission.widgetSchema) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Workshop schema metadata does not match its content" });
    }
    return { submission, widget: validation.data };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    logger.error("Workshop widget lookup failed", {
      event: "workshop_widget_lookup_failed",
      errorName: "WorkshopBackendError",
    });
    throw new TRPCError({ code: "BAD_GATEWAY", message: "Workshop is unavailable" });
  }
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, canonical(child)]),
  );
}

export function widgetFingerprint(widget: HomarrCustomWidgetV2, portable = false) {
  let value = widget;
  if (widget.$schema === "homarr-custom-widget-v3") value = { ...widget, extensions: widget.extensions ?? {} };
  if (portable) value = toPortableCustomWidgetDefinition(value);
  if (portable)
    value = {
      ...value,
      sources: Object.fromEntries(
        Object.entries(widget.sources).map(([id, source]) => [
          id,
          { ...source, baseUrl: "https://local.invalid", networkScope: "public" as const },
        ]),
      ),
    };
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function createWorkshopOrigin(
  submission: { id: string; revision: number },
  original: HomarrCustomWidgetV2,
  installed: HomarrCustomWidgetV2,
) {
  return {
    endpoint: workshopUrls.workshopApiUrl.replace(/\/+$/u, ""),
    submissionId: submission.id,
    revision: submission.revision,
    fingerprint: widgetFingerprint(original),
    installedFingerprint: widgetFingerprint(installed, true),
  };
}
