import packageJson from "~/../package.json";

const getPackageVersion = () => packageJson.version;
const getDependencies = (): PackageJsonDependencies => packageJson.dependencies;

export const getPackageAttributes = () => {
  return {
    version: getPackageVersion(),
    dependencies: getDependencies(),
  };
};

type PackageJsonDependencies = { [key in string]: string };
