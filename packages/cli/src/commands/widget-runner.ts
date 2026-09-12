import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { boolean, command, number, positional, string } from "@drizzle-team/brocli";

import { customWidgetArchiveSchema } from "@homarr/custom-widgets/package";

export const widgetRunnerCommand = command({
  name: "serve",
  desc: "Run one installed trusted widget archive on this machine without registry access",
  options: {
    file: positional("file").required().desc("Trusted widget archive JSON"),
    trust: boolean("trust").desc("Allow the package to execute with this process's operating system privileges"),
    host: string("host").default("127.0.0.1").desc("Interface to listen on"),
    port: number("port").int().min(0).max(65535).default(8787).desc("HTTP port"),
    tokenEnv: string("token-env")
      .default("HOMARR_WIDGET_RUNNER_TOKEN")
      .desc("Environment variable containing the runner bearer token"),
  },
  handler: async ({ file, trust, host, port, tokenEnv }) => {
    if (trust !== true) throw new Error("Pass --trust to execute this package with this machine's privileges");
    const token = process.env[tokenEnv];
    if (!token) throw new Error(`Set ${tokenEnv} to a random token with at least 32 characters`);
    const archive = customWidgetArchiveSchema.parse(JSON.parse(await readFile(resolve(file), "utf8")));
    const { assertWidgetArtifactIntegrity, startWidgetPackageRunner } =
      await import("@homarr/custom-widgets/package/server");
    assertWidgetArtifactIntegrity(archive.artifact, archive.source);
    const runner = await startWidgetPackageRunner({
      artifact: archive.artifact,
      rootDirectory: resolve(dirname(file), ".homarr-widgets"),
      token,
      host,
      port,
    });
    console.log(
      `Serving ${archive.source.manifest.id}@${archive.source.manifest.version} at ${JSON.stringify(runner.address)}`,
    );
    await new Promise<void>((done, reject) => {
      const stop = () => {
        process.removeListener("SIGINT", stop);
        process.removeListener("SIGTERM", stop);
        void runner.close().then(done, reject);
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    });
  },
});
