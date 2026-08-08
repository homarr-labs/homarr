import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BenchmarkPairInput, BuildResult, RuntimeResult } from "./benchmark-pair-lib.mts";
import { compareBenchmarkPair } from "./benchmark-pair-lib.mts";

const values = new Map<string, string[]>();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!flag?.startsWith("--") || !value) throw new Error(`Invalid argument at ${String(flag)}`);
  values.set(flag, [...(values.get(flag) ?? []), value]);
}

const requireMany = (flag: string) => {
  const result = values.get(flag) ?? [];
  if (result.length === 0) throw new Error(`${flag} is required`);
  return result;
};
const requireOne = (flag: string) => {
  const result = requireMany(flag);
  if (result.length !== 1) throw new Error(`${flag} must be provided exactly once`);
  return result[0] as string;
};
const readJson = async <T,>(file: string) => JSON.parse(await readFile(path.resolve(file), "utf8")) as T;

const input: BenchmarkPairInput = {
  baselineWarmup: await readJson<BuildResult>(requireOne("--baseline-warmup")),
  candidateWarmup: await readJson<BuildResult>(requireOne("--candidate-warmup")),
  baselineBuilds: await Promise.all(requireMany("--baseline-build").map(readJson<BuildResult>)),
  candidateBuilds: await Promise.all(requireMany("--candidate-build").map(readJson<BuildResult>)),
  baselineRuntime: await readJson<RuntimeResult>(requireOne("--baseline-runtime")),
  candidateRuntime: await readJson<RuntimeResult>(requireOne("--candidate-runtime")),
};
const result = compareBenchmarkPair(input);
const outputPath = path.resolve(requireOne("--output"));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ...result }, null, 2));
if (!result.claimEligible) process.exitCode = 1;
