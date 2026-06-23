import { describe, expect, test } from "vitest";

import { mediaUploadSchema, supportedVideoUploadFormats } from "./media";

const createFormData = (file: File) => {
  const formData = new FormData();
  formData.append("files", file);
  return formData;
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

  test("should reject unsupported uploads", () => {
    const result = mediaUploadSchema.safeParse(
      createFormData(
        new File(["not a supported media format"], "background.txt", {
          type: "text/plain",
        }),
      ),
    );

    expect(result.success).toBe(false);
  });
});
