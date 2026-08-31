// @vitest-environment node

import { mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import { createZoomExtensionContent, generateZoomExtension, parseZoomOptions } from "./zoom.mts";

const temporaryDirectories: string[] = [];

const createOutputPath = (suffix: string) => {
  const directory = path.join(
    tmpdir(),
    `homarr-release-v2-qa-zoom-${process.pid}-${Date.now()}-${suffix}-${temporaryDirectories.length}`,
  );
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("release-v2 native zoom helper", () => {
  test("generates deterministic, exact-origin MV3 extension files", async () => {
    const firstOutput = createOutputPath("first");
    const secondOutput = createOutputPath("second");
    const firstOptions = await parseZoomOptions([
      "--origin",
      "http://127.0.0.1:34401/",
      "--factor",
      "1.25",
      "--output",
      firstOutput,
    ]);
    const secondOptions = await parseZoomOptions([
      "--origin",
      "http://127.0.0.1:34401",
      "--factor",
      "1.25",
      "--output",
      secondOutput,
    ]);

    await generateZoomExtension(firstOptions);
    await generateZoomExtension(secondOptions);

    const firstManifest = await readFile(path.join(firstOutput, "manifest.json"), "utf8");
    const firstBackground = await readFile(path.join(firstOutput, "background.js"), "utf8");
    expect(firstManifest).toBe(await readFile(path.join(secondOutput, "manifest.json"), "utf8"));
    expect(firstBackground).toBe(await readFile(path.join(secondOutput, "background.js"), "utf8"));
    expect(JSON.parse(firstManifest)).toMatchObject({
      manifest_version: 3,
      permissions: ["tabs"],
      host_permissions: ["http://127.0.0.1:34401/*"],
      background: { service_worker: "background.js" },
    });
    expect(firstBackground).toContain('const TARGET_ORIGIN = "http://127.0.0.1:34401";');
    expect(firstBackground).toContain("const ZOOM_FACTOR = 1.25;");
    expect(firstBackground).toContain("origin !== TARGET_ORIGIN");
    expect(firstBackground).not.toContain("password");
  });

  test.each(["0.8", "1", "1.25", "2"])("accepts the supported factor %s", async (factor) => {
    const output = createOutputPath(`factor-${factor.replace(".", "-")}`);
    const options = await parseZoomOptions([
      "--origin",
      "https://qa.example.test:8443",
      "--factor",
      factor,
      "--output",
      output,
    ]);

    expect(options.factor).toBe(Number(factor));
  });

  test.each(["0", "0.9", "1.0", "1.5", "2.1", "not-a-number"])("rejects unsupported factor %s", async (factor) => {
    const output = createOutputPath(`invalid-factor-${factor.replaceAll(/[^A-Za-z0-9]/gu, "-")}`);
    await expect(
      parseZoomOptions(["--origin", "http://127.0.0.1:34401", "--factor", factor, "--output", output]),
    ).rejects.toThrow("--factor must be one of 0.8, 1, 1.25, or 2");
  });

  test.each([
    "ftp://127.0.0.1:34401",
    "http://user:secret@127.0.0.1:34401",
    "http://127.0.0.1:34401/boards/qa-grid-24",
    "http://127.0.0.1:34401/?mode=qa",
    "not-a-url",
  ])("rejects a non-origin target without echoing it: %s", async (origin) => {
    const output = createOutputPath("invalid-origin");
    await expect(parseZoomOptions(["--origin", origin, "--factor", "1", "--output", output])).rejects.toThrow(
      /--origin/u,
    );
  });

  test("requires a new, predictably named direct child of the temporary directory", async () => {
    const existingDirectory = createOutputPath("existing");
    const nestedParent = createOutputPath("nested-parent");
    await mkdir(existingDirectory);
    await mkdir(nestedParent);
    await expect(
      parseZoomOptions(["--origin", "http://127.0.0.1:34401", "--factor", "1", "--output", "relative-extension"]),
    ).rejects.toThrow("--output must be an absolute path");
    await expect(
      parseZoomOptions(["--origin", "http://127.0.0.1:34401", "--factor", "1", "--output", existingDirectory]),
    ).rejects.toThrow("--output must not already exist");
    await expect(
      parseZoomOptions([
        "--origin",
        "http://127.0.0.1:34401",
        "--factor",
        "1",
        "--output",
        path.join(nestedParent, "homarr-release-v2-qa-zoom-nested"),
      ]),
    ).rejects.toThrow("direct child");
    await expect(
      parseZoomOptions([
        "--origin",
        "http://127.0.0.1:34401",
        "--factor",
        "1",
        "--output",
        path.join(tmpdir(), "uncontrolled-extension"),
      ]),
    ).rejects.toThrow("basename must start");
  });

  test("canonicalizes a temporary-directory alias for extension output", async () => {
    const temporaryAlias = createOutputPath("alias-parent");
    await symlink(tmpdir(), temporaryAlias, "dir");
    const outputName = `homarr-release-v2-qa-zoom-${process.pid}-${Date.now()}-through-alias`;
    const canonicalOutput = path.join(tmpdir(), outputName);
    temporaryDirectories.push(canonicalOutput);

    const options = await parseZoomOptions([
      "--origin",
      "http://127.0.0.1:34401",
      "--factor",
      "1",
      "--output",
      path.join(temporaryAlias, outputName),
    ]);

    expect(options.outputDirectory).toBe(canonicalOutput);
  });

  test("renders baseline factor 1 without changing the extension shape", () => {
    const content = createZoomExtensionContent("https://qa.example.test", 1);
    expect(content.background).toContain("const ZOOM_FACTOR = 1;");
  });
});
