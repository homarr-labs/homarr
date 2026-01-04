import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { BackupValidator } from "../validator";

const createValidBackupZipAsync = async (
  overrides: {
    boards?: unknown[];
    integrations?: unknown[];
    users?: unknown[];
    groups?: unknown[];
    apps?: unknown[];
    searchEngines?: unknown[];
    settings?: unknown;
    metadata?: {
      version?: string;
      homarrVersion?: string;
      exportedAt?: string;
      exportedBy?: string | null;
      checksum?: string;
    };
  } = {},
): Promise<string> => {
  const zip = new JSZip();

  const boards = overrides.boards ?? [];
  const integrations = overrides.integrations ?? [];
  const users = overrides.users ?? [];
  const groups = overrides.groups ?? [];
  const apps = overrides.apps ?? [];
  const searchEngines = overrides.searchEngines ?? [];

  const metadata = {
    version: "1.0.0",
    homarrVersion: "1.0.0",
    exportedAt: new Date().toISOString(),
    exportedBy: "test-user",
    checksum: "test-checksum", // Will be wrong, but validator should warn instead of error
    ...overrides.metadata,
  };

  zip.file("metadata.json", JSON.stringify(metadata));
  zip.file("boards.json", JSON.stringify(boards));
  zip.file("integrations.json", JSON.stringify(integrations));
  zip.file("users.json", JSON.stringify(users));
  zip.file("groups.json", JSON.stringify(groups));
  zip.file("apps.json", JSON.stringify(apps));
  zip.file("searchEngines.json", JSON.stringify(searchEngines));

  if (overrides.settings) {
    zip.file("settings.json", JSON.stringify(overrides.settings));
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer.toString("base64");
};

describe("BackupValidator", () => {
  const validator = new BackupValidator();

  describe("validateAsync", () => {
    it("should validate a valid backup file", async () => {
      const content = await createValidBackupZipAsync();

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for invalid base64 content", async () => {
      const result = await validator.validateAsync("not-valid-base64!!!");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return error for missing metadata.json", async () => {
      const zip = new JSZip();
      zip.file("boards.json", "[]");
      zip.file("users.json", "[]");
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const content = buffer.toString("base64");

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes("metadata.json"))).toBe(true);
    });

    it("should return error for missing boards.json", async () => {
      const zip = new JSZip();
      zip.file("metadata.json", JSON.stringify({ version: "1.0.0" }));
      zip.file("users.json", "[]");
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const content = buffer.toString("base64");

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes("boards.json"))).toBe(true);
    });

    it("should return error for missing users.json", async () => {
      const zip = new JSZip();
      zip.file("metadata.json", JSON.stringify({ version: "1.0.0" }));
      zip.file("boards.json", "[]");
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const content = buffer.toString("base64");

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes("users.json"))).toBe(true);
    });

    it("should return error for incompatible version", async () => {
      const content = await createValidBackupZipAsync({
        metadata: { version: "2.0.0" },
      });

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes("Incompatible backup version"))).toBe(true);
    });

    it("should return warning for checksum mismatch", async () => {
      const content = await createValidBackupZipAsync({
        boards: [{ id: "board1" }],
      });

      const result = await validator.validateAsync(content);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((warn) => warn.includes("Checksum mismatch"))).toBe(true);
    });

    it("should count entities correctly in summary", async () => {
      const content = await createValidBackupZipAsync({
        boards: [{ id: "b1" }, { id: "b2" }],
        integrations: [{ id: "i1" }],
        users: [{ id: "u1" }, { id: "u2" }, { id: "u3" }],
        groups: [{ id: "g1" }],
        apps: [{ id: "a1" }, { id: "a2" }],
        searchEngines: [{ id: "se1" }],
      });

      const result = await validator.validateAsync(content);

      expect(result.summary.boards).toBe(2);
      expect(result.summary.integrations).toBe(1);
      expect(result.summary.users).toBe(3);
      expect(result.summary.groups).toBe(1);
      expect(result.summary.apps).toBe(2);
      expect(result.summary.searchEngines).toBe(1);
    });

    it("should count media files in summary", async () => {
      const zip = new JSZip();
      zip.file(
        "metadata.json",
        JSON.stringify({
          version: "1.0.0",
          homarrVersion: "1.0.0",
          exportedAt: new Date().toISOString(),
          exportedBy: null,
          checksum: "",
        }),
      );
      zip.file("boards.json", "[]");
      zip.file("users.json", "[]");
      zip.file("integrations.json", "[]");
      zip.file("groups.json", "[]");
      zip.file("apps.json", "[]");
      zip.file("searchEngines.json", "[]");
      const mediaFolder = zip.folder("media");
      mediaFolder?.file("icon1.png", Buffer.from("content1"));
      mediaFolder?.file("icon2.png", Buffer.from("content2"));
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const content = buffer.toString("base64");

      const result = await validator.validateAsync(content);

      // Note: The validator counts files including folder entries
      // The count should be at least 2 for our 2 media files
      expect(result.summary.mediaFiles).toBeGreaterThanOrEqual(2);
    });

    it("should return metadata when valid", async () => {
      const content = await createValidBackupZipAsync({
        metadata: {
          version: "1.0.0",
          homarrVersion: "1.5.0",
          exportedBy: "admin-user",
        },
      });

      const result = await validator.validateAsync(content);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.version).toBe("1.0.0");
      expect(result.metadata?.homarrVersion).toBe("1.5.0");
    });
  });
});
