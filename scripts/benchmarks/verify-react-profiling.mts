/**
 * Verifies a built image actually ships React's *profiling* renderer, which is what
 * React DevTools needs before it will enable the Profiler tab instead of reporting
 * "Profiling support requires either a development or profiling build of React".
 *
 *   node --experimental-strip-types scripts/benchmarks/verify-react-profiling.mts homarr:performance
 *
 * Why a bundle check and not a runtime one: DevTools decides from the renderer object
 * React passes to `__REACT_DEVTOOLS_GLOBAL_HOOK__.inject()`, but a synthetic hook makes
 * React send a reduced payload that is byte-identical for profiling and production
 * builds — so a Playwright probe cannot tell them apart and gives a false negative.
 * The marker below can: it exists only in React's profiling bundle.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const image = process.argv[2];
if (!image) throw new Error("usage: verify-react-profiling.mts <docker-image>");

/** Present in react-dom-profiling.profiling.js, absent from react-dom-client.production.js. */
const PROFILING_MARKER = "TracingMarker";

const run = async (script: string) => {
  const { stdout } = await execFileAsync("docker", ["run", "--rm", "--entrypoint", "sh", image, "-c", script], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
};

const clientChunks = Number(
  await run(`grep -rl "${PROFILING_MARKER}" /app/apps/nextjs/.next/static/chunks 2>/dev/null | wc -l`),
);
const vendoredEntry = await run(
  `grep -o "react-dom-[a-z.]*\\.js" /app/node_modules/next/dist/compiled/react-dom/client.js 2>/dev/null | tail -1 || echo "(entry not present in runtime image)"`,
);
const sourceMaps = Number(await run(`find /app/apps/nextjs/.next/static -name "*.map" 2>/dev/null | wc -l`));

console.log(`image:                    ${image}`);
console.log(`client chunks with React profiling renderer: ${clientChunks}`);
console.log(`vendored react-dom client entry points at:   ${vendoredEntry}`);
console.log(`browser source maps:      ${sourceMaps}`);

const ok = clientChunks > 0;
console.log(
  ok
    ? "\nPROFILING BUILD CONFIRMED — React's profiling renderer is in the client bundle"
    : "\nNOT A PROFILING BUILD — rebuild with: docker build --build-arg HOMARR_PROFILING=true .",
);
if (!ok) process.exitCode = 1;
