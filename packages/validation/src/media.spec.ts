import { describe, expect, test } from "vitest";
import type { z } from "zod/v4";

import { mediaUploadSchema, supportedImageUploadFormats, supportedVideoUploadFormats } from "./media";

const createFormData = (file: File) => {
  const formData = new FormData();
  formData.append("files", file);
  return formData;
};

const expectCustomIssueKey = (issue: z.core.$ZodIssue | undefined, key: string) => {
  expect(issue?.code).toBe("custom");
  if (issue?.code !== "custom") return;
  expect(issue.params?.i18n).toMatchObject({ key });
};

describe("mediaUploadSchema", () => {
  test.each(supportedVideoUploadFormats)("should accept %s uploads", (contentType) => {
    const result = mediaUploadSchema.safeParse(
      createFormData(
        new File(["video"], `background.${contentType.split("/")[1]}`, {
          type: contentType,
        }),
      ),
    );

    expect(result.success).toBe(true);
  });

  test.each(supportedImageUploadFormats)("should continue accepting %s uploads", (contentType) => {
    const result = mediaUploadSchema.safeParse(
      createFormData(
        new File(["image"], `background.${contentType.split("/")[1]}`, {
          type: contentType,
        }),
      ),
    );

    expect(result.success).toBe(true);
  });

  test("should reject unsupported file types", () => {
    const result = mediaUploadSchema.safeParse(
      createFormData(
        new File(["not a supported media format"], "background.txt", {
          type: "text/plain",
        }),
      ),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expectCustomIssueKey(result.error.issues[0], "invalidFileType");
  });

  test("should reject files larger than 32 MB", () => {
    const result = mediaUploadSchema.safeParse(
      createFormData(
        new File([new Uint8Array(1024 * 1024 * 32 + 1)], "background.mp4", {
          type: "video/mp4",
        }),
      ),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expectCustomIssueKey(result.error.issues[0], "fileTooLarge");
  });
});
