import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { boolean, command, positional, string } from "@drizzle-team/brocli";

import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";
import { widgetRunnerCommand } from "./widget-runner";
import { widgetInitCommand } from "./widget-init";
import { widgetPreviewCommand } from "./widget-preview";
import { widgetPublishCommand } from "./widget-publish";
import { widgetCollectionCommand } from "./widget-collection";

const inputOptions = () => ({
  file: positional("path").required().desc("Widget project directory, package JSON, or archive"),
});
const buildOptions = () => ({
  ...inputOptions(),
  output: string("output").alias("o").desc("Output JSON file (must not already exist)"),
  trust: boolean("trust").desc("Trust the package and allow installing its exact dependencies"),
});

const validate = command({
  name: "validate",
  desc: "Validate a widget package or offline archive without executing its code",
  options: inputOptions(),
  handler: async ({ file }) => {
    const { loadCustomWidgetProject } = await import("@homarr/custom-widgets/package/server");
    const { source, archive } = await loadCustomWidgetProject(file);
    if (archive) {
      console.log(`Valid archive: ${source.manifest.id}@${source.manifest.version}`);
      return;
    }
    console.log(`Valid package: ${source.manifest.id}@${source.manifest.version}`);
  },
});

const build = command({
  name: "build",
  desc: "Compile a widget package to an immutable browser/server artifact",
  options: buildOptions(),
  handler: async ({ file, output, trust }) => {
    const { compileCustomWidgetPackage, loadCustomWidgetProject } =
      await import("@homarr/custom-widgets/package/server");
    const project = await loadCustomWidgetProject(file);
    const artifact =
      project.archive?.artifact ??
      (await compileCustomWidgetPackage(project.source, {
        rootDirectory: join(project.projectDirectory, ".homarr-widgets"),
        allowDependencyInstall: trust === true,
      }));
    const target = resolve(output ?? join(project.projectDirectory, "dist", "widget.artifact.json"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(artifact, null, 2), { flag: "wx", mode: 0o600 });
    console.log(`Built ${artifact.digest}: ${target}`);
  },
});

const pack = command({
  name: "pack",
  desc: "Package source, assets, dependency lock and compiled code for offline installation",
  options: buildOptions(),
  handler: async ({ file, output, trust }) => {
    const { compileCustomWidgetPackage, loadCustomWidgetProject } =
      await import("@homarr/custom-widgets/package/server");
    const project = await loadCustomWidgetProject(file);
    const source = project.source;
    const artifact =
      project.archive?.artifact ??
      (await compileCustomWidgetPackage(source, {
        rootDirectory: join(project.projectDirectory, ".homarr-widgets"),
        allowDependencyInstall: trust === true,
      }));
    const archive = customWidgetArchiveSchema.parse({ format: "homarr-widget-archive-v3", source, artifact });
    const target = resolve(output ?? join(project.projectDirectory, "dist", "widget.homarr-widget.json"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(archive, null, 2), { flag: "wx", mode: 0o600 });
    console.log(`Packed ${source.manifest.id}@${source.manifest.version}: ${target}`);
  },
});

export const widgetsRoot = command({
  name: "widgets",
  desc: "Validate, build and package trusted custom widgets",
  subcommands: [
    widgetInitCommand,
    validate,
    build,
    pack,
    widgetPreviewCommand,
    widgetPublishCommand,
    widgetRunnerCommand,
    widgetCollectionCommand,
  ],
});
