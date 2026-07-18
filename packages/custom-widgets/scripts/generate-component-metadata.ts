import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import * as Charts from "@mantine/charts";
import * as Core from "@mantine/core";
import * as Dates from "@mantine/dates";
import ts from "typescript";

import { discoveredMantineComponents } from "../src/core/component-discovery";
import { deniedCustomJsxComponentNames } from "../src/core/component-registry-denied";
import { isBlockedCustomJsxProp } from "../src/jsx/policy";

void [Core, Dates, Charts];

const packageRoot = resolve(import.meta.dirname, "..");
const configPath = resolve(packageRoot, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageRoot);
const program = ts.createProgram({ rootNames: [...config.fileNames, import.meta.filename], options: config.options });
const checker = program.getTypeChecker();
const source = program.getSourceFile(import.meta.filename);
if (!source) throw new Error("Unable to inspect the component metadata generator");

const moduleSymbols = new Map<string, ts.Symbol>();
for (const declaration of source.statements) {
  if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteral(declaration.moduleSpecifier)) continue;
  const moduleName = declaration.moduleSpecifier.text;
  if (!moduleName.startsWith("@mantine/")) continue;
  const symbol = checker.getSymbolAtLocation(declaration.moduleSpecifier);
  if (symbol) moduleSymbols.set(moduleName, symbol);
}

function isCallableType(type: ts.Type): boolean {
  if (type.getCallSignatures().length > 0) return true;
  return type.isUnionOrIntersection() && type.types.some(isCallableType);
}
const metadata: Record<string, string[]> = {};
for (const component of discoveredMantineComponents) {
  if (deniedCustomJsxComponentNames.has(component.name)) continue;
  const moduleSymbol = moduleSymbols.get(component.package);
  const rootName = component.name.split(".")[0];
  let symbol =
    moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((candidate) => candidate.name === rootName);
  let location = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? source;
  let type = symbol && checker.getTypeOfSymbolAtLocation(symbol, location);
  for (const segment of component.name.split(".").slice(1)) {
    symbol = type?.getProperty(segment);
    if (!symbol) break;
    location = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? location;
    type = checker.getTypeOfSymbolAtLocation(symbol, location);
  }
  const signature = type?.getCallSignatures()[0] ?? type?.getConstructSignatures()[0];
  const parameter = signature?.parameters[0];
  const props = parameter
    ? checker.getPropertiesOfType(checker.getTypeOfSymbolAtLocation(parameter, parameter.valueDeclaration ?? location))
    : [];
  metadata[component.name] = props
    .filter((prop) => {
      const declaration = prop.valueDeclaration ?? prop.declarations?.[0] ?? location;
      return (
        !isBlockedCustomJsxProp(prop.name) && !isCallableType(checker.getTypeOfSymbolAtLocation(prop, declaration))
      );
    })
    .map((prop) => prop.name)
    .toSorted();
}

await writeFile(
  resolve(packageRoot, "src/core/component-props.generated.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
);
