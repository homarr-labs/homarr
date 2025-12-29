import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { BackupMetadata, FullBackupData, MediaFile } from "../../types";
import { createZipArchiveAsync, extractZipArchiveAsync, getMediaFilesFromZipAsync } from "../zip-format";

const createTestMetadata = (): BackupMetadata => ({
  version: "1.0.0",
  homarrVersion: "1.0.0",
  exportedAt: new Date().toISOString(),
  exportedBy: "test-user",
  checksum: "abc123",
});

const createTestData = (): FullBackupData => ({
  boards: [{ id: "board1", name: "Test Board" }],
  integrations: [{ id: "int1", name: "Test Integration" }],
  users: [{ id: "user1", name: "Test User" }],
  groups: [{ id: "group1", name: "Test Group" }],
  apps: [{ id: "app1", name: "Test App" }],
  settings: { key: "value" },
  searchEngines: [{ id: "se1", name: "Google" }],
});

const createTestMediaFiles = (): MediaFile[] => [
  { name: "icon1.png", content: Buffer.from("fake-png-content") },
  { name: "icon2.svg", content: Buffer.from("fake-svg-content") },
];

describe("createZipArchiveAsync", () => {
  it("should create a valid ZIP archive", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();
    const mediaFiles: MediaFile[] = [];

    const buffer = await createZipArchiveAsync(metadata, data, mediaFiles);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should include metadata.json in the archive", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();

    const buffer = await createZipArchiveAsync(metadata, data, []);
    const zip = await JSZip.loadAsync(buffer);

    const metadataFile = zip.file("metadata.json");
    expect(metadataFile).not.toBeNull();

    const content = await metadataFile?.async("string");
    expect(content).toBeDefined();
    const parsed = JSON.parse(content ?? "") as { version: string };
    expect(parsed.version).toBe(metadata.version);
  });

  it("should include all data files in the archive", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();

    const buffer = await createZipArchiveAsync(metadata, data, []);
    const zip = await JSZip.loadAsync(buffer);

    expect(zip.file("boards.json")).not.toBeNull();
    expect(zip.file("integrations.json")).not.toBeNull();
    expect(zip.file("users.json")).not.toBeNull();
    expect(zip.file("groups.json")).not.toBeNull();
    expect(zip.file("apps.json")).not.toBeNull();
    expect(zip.file("settings.json")).not.toBeNull();
    expect(zip.file("searchEngines.json")).not.toBeNull();
  });

  it("should include media files in media folder", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();
    const mediaFiles = createTestMediaFiles();

    const buffer = await createZipArchiveAsync(metadata, data, mediaFiles);
    const zip = await JSZip.loadAsync(buffer);

    const mediaFolder = zip.folder("media");
    expect(mediaFolder).not.toBeNull();
    expect(zip.file("media/icon1.png")).not.toBeNull();
    expect(zip.file("media/icon2.svg")).not.toBeNull();
  });

  it("should not include settings.json if settings is null", async () => {
    const metadata = createTestMetadata();
    const data = { ...createTestData(), settings: null };

    const buffer = await createZipArchiveAsync(metadata, data, []);
    const zip = await JSZip.loadAsync(buffer);

    expect(zip.file("settings.json")).toBeNull();
  });
});

describe("extractZipArchiveAsync", () => {
  it("should extract metadata and data from a valid ZIP", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();

    const buffer = await createZipArchiveAsync(metadata, data, []);
    const result = await extractZipArchiveAsync(buffer);

    expect(result.metadata.version).toBe(metadata.version);
    expect(result.data.boards).toHaveLength(1);
    expect(result.data.integrations).toHaveLength(1);
  });

  it("should throw error for missing metadata.json", async () => {
    const zip = new JSZip();
    zip.file("boards.json", "[]");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await expect(extractZipArchiveAsync(buffer)).rejects.toThrow("Missing metadata.json");
  });

  it("should handle missing optional data files gracefully", async () => {
    const zip = new JSZip();
    zip.file("metadata.json", JSON.stringify(createTestMetadata()));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const result = await extractZipArchiveAsync(buffer);

    expect(result.data.boards).toEqual([]);
    expect(result.data.integrations).toEqual([]);
    expect(result.data.users).toEqual([]);
    expect(result.data.groups).toEqual([]);
    expect(result.data.apps).toEqual([]);
    expect(result.data.settings).toBeNull();
    expect(result.data.searchEngines).toEqual([]);
  });

  it("should return media folder when present", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();
    const mediaFiles = createTestMediaFiles();

    const buffer = await createZipArchiveAsync(metadata, data, mediaFiles);
    const result = await extractZipArchiveAsync(buffer);

    expect(result.mediaFolder).not.toBeNull();
  });
});

describe("getMediaFilesFromZipAsync", () => {
  it("should extract media files from ZIP", async () => {
    const metadata = createTestMetadata();
    const data = createTestData();
    const mediaFiles = createTestMediaFiles();

    const buffer = await createZipArchiveAsync(metadata, data, mediaFiles);
    const zip = await JSZip.loadAsync(buffer);

    const result = await getMediaFilesFromZipAsync(zip);

    expect(result.size).toBe(2);
    expect(result.has("icon1.png")).toBe(true);
    expect(result.has("icon2.svg")).toBe(true);
  });

  it("should return empty map when no media folder exists", async () => {
    const zip = new JSZip();
    zip.file("metadata.json", JSON.stringify(createTestMetadata()));

    const result = await getMediaFilesFromZipAsync(zip);

    expect(result.size).toBe(0);
  });

  it("should not include directory entries", async () => {
    const zip = new JSZip();
    const mediaFolder = zip.folder("media");
    mediaFolder?.file("icon.png", Buffer.from("content"));

    const result = await getMediaFilesFromZipAsync(zip);

    // Should only have the file, not the folder entry
    expect(result.size).toBe(1);
  });
});
