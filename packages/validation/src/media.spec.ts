import { describe, expect, it } from "vitest";

import {
  mediaUploadSchema,
  supportedImageUploadFormats,
  supportedMediaUploadFormats,
  supportedVideoUploadFormats,
} from "./media";

const createFile = (type: string, name = "file", size = 1024) => new File([new Uint8Array(size)], name, { type });

const createFormData = (files: File[]) => {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  return formData;
};

describe("mediaUploadSchema", () => {
  it("should accept supported image formats", () => {
    for (const type of supportedImageUploadFormats) {
      const result = mediaUploadSchema.safeParse(createFormData([createFile(type, `image.${type.split("/")[1]}`)]));
      expect(result.success).toBe(true);
    }
  });

  it("should accept supported video formats", () => {
    expect(supportedVideoUploadFormats).toEqual(["video/mp4", "video/webm"]);
    for (const type of supportedVideoUploadFormats) {
      const result = mediaUploadSchema.safeParse(createFormData([createFile(type, `video.${type.split("/")[1]}`)]));
      expect(result.success).toBe(true);
    }
  });

  it("should include video formats in supportedMediaUploadFormats", () => {
    expect(supportedMediaUploadFormats).toEqual([...supportedImageUploadFormats, ...supportedVideoUploadFormats]);
  });

  it("should reject unsupported file types", () => {
    const result = mediaUploadSchema.safeParse(createFormData([createFile("application/pdf", "document.pdf")]));
    expect(result.success).toBe(false);
  });

  it("should reject files larger than 32 MB", () => {
    const result = mediaUploadSchema.safeParse(
      createFormData([createFile("video/mp4", "large.mp4", 1024 * 1024 * 33)]),
    );
    expect(result.success).toBe(false);
  });
});
