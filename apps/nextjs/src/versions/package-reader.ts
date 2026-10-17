import fsPromises from "fs/promises";
import { glob } from "glob";

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
  return new Map(Object.entries(packageJson.workspaces.catalog));
};

export type PackageJsonDependencies = Record<string, string>;
interface PackageJson {
  dependencies: PackageJsonDependencies | undefined;
}
