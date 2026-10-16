const metadataPath = process.argv[2];
if (!metadataPath) throw new Error("A platform build metafile is required");

const metadata = (await Bun.file(metadataPath).json()) as { inputs: Record<string, unknown> };
const inputs = Object.keys(metadata.inputs);
const forbidden = inputs.filter(
  (path) =>
    /(?:^|\/)packages\/(?:api|auth|backend-handlers|db|integrations|redis|ui|widgets)\//.test(path) ||
    /(?:^|\/)node_modules\/(?:next|next-auth|react|react-dom|ioredis|drizzle-orm|@mantine\/[^/]+)\//.test(path),
);
if (forbidden.length) throw new Error(`Platform imports worker or frontend code:\n${forbidden.join("\n")}`);
console.log(`Platform bundle verified: ${inputs.length} modules; no worker API, database driver or frontend runtime`);
