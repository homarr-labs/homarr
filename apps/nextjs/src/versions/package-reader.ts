import fsPromises from "fs/promises";

import packageJson from "../../../../package.json";

export const getPackageVersion = () => packageJson.version;
export const getDependenciesAsync = async (): Promise<PackageJsonDependencies> => {
  const { glob } = await import("glob");
  const pathNames = await glob("**/package.json", {
    ignore: "**/node_modules/**",
    cwd: "../../",
    absolute: true,
  });
  const packageContents = await Promise.all(pathNames.map(async (path) => await fsPromises.readFile(path, "utf-8")));
  const packageDependencies = packageContents
    .map((packageContent) => (JSON.parse(packageContent) as PackageJson).dependencies)
    .filter((dependencies) => dependencies !== undefined);

  const catalog = new Map(Object.entries(packageJson.workspaces.catalog));

  const dependencies = new Map<string, string>();
  for (const dependenciesOfPackage of packageDependencies) {
    for (const [name, version] of Object.entries(dependenciesOfPackage)) {
      dependencies.set(name, catalog.get(name) ?? version);
    }
  }
  return Object.fromEntries(dependencies);
};

export type PackageJsonDependencies = Record<string, string>;
interface PackageJson {
  dependencies: PackageJsonDependencies | undefined;
}
