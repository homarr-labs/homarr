import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";
import z from "zod";

import packageJson from "../../../../package.json";

export const getPackageVersion = () => packageJson.version;
export const getDependenciesAsync = async (): Promise<PackageJsonDependencies> => {
  const pathNames = await glob("**/package.json", {
    ignore: "**/node_modules/**",
    cwd: "../../",
    absolute: true,
  });
  const packageContents = await Promise.all(pathNames.map(async (path) => await fsPromises.readFile(path, "utf-8")));
  const packageDependencies = packageContents
    .map((packageContent) => (JSON.parse(packageContent) as PackageJson).dependencies)
    .filter((dependencies) => dependencies !== undefined);

  const catalog = await parseDependencyCatalogsAsync();

  let dependencies = {};
  for (const dependenciesOfPackage of packageDependencies) {
    const resolvedDependencies = Object.entries(dependenciesOfPackage).map(([name, version]) => {
      const catalogVersion = catalog.get(name);
      return [name, catalogVersion ?? version] as const;
    });
    dependencies = { ...dependencies, ...Object.fromEntries(resolvedDependencies) };
  }
  return dependencies;
};

type DependencyCatalog = Map<string, string>;
const parseDependencyCatalogsAsync = async (): Promise<DependencyCatalog> => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceConfigContent = await fsPromises.readFile(
    path.join(currentDir, "..", "..", "..", "..", "pnpm-workspace.yaml"),
    "utf-8",
  );
  const workspaceConfig: unknown = parseYaml(workspaceConfigContent);
  const parseResult = workspaceConfigCatalogSchema.parse(workspaceConfig);

  return new Map(Object.entries(parseResult.catalog ?? {}));
};

const workspaceConfigCatalogSchema = z.object({
  catalog: z.record(z.string(), z.string()).optional(),
});

export type PackageJsonDependencies = Record<string, string>;
interface PackageJson {
  dependencies: PackageJsonDependencies | undefined;
}
