import { parseCustomWidgetAiResponse } from "../src/core/import";

const positiveValidationClaimPatterns = [
  /\b(?:validation|validator)\s+(?:passed|succeeded|completed cleanly|is clean)\b/iu,
  /(?<!\bnot )(?<!\bnever )\b(?:validated|verified|confirmed valid)\b/iu,
  /\b(?:preview|render(?:ed|ing))\s+(?:passed|succeeded|successfully)\b/iu,
];

const response = await new Promise<string>((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk: string) => {
    value += chunk;
  });
  process.stdin.on("end", () => resolve(value));
  process.stdin.on("error", reject);
});
const parsed = parseCustomWidgetAiResponse(response);
const validationClaim = positiveValidationClaimPatterns.some((pattern) => pattern.test(response));

if (!parsed.success) {
  console.log(
    JSON.stringify({
      ok: false,
      syntax: "schema-and-jsx",
      renderer: "not-run",
      validationClaim,
      issues: parsed.issues.map((issue) => ({ code: issue.code, path: issue.path, message: issue.message })),
    }),
  );
  // The runtime benchmark consumes this machine-readable `ok` field and keeps
  // process success for expected invalid artifacts; callers must inspect JSON.
  process.exit(0);
}

console.log(
  JSON.stringify({
    ok: true,
    syntax: "schema-and-jsx",
    renderer: "not-run",
    validationClaim,
    issues: [],
    widget: {
      schema: parsed.widget.$schema,
      sourceIds: Object.keys(parsed.widget.sources),
      requestIds: Object.keys(parsed.widget.requests),
      templateCharacters: parsed.widget.template.length,
    },
  }),
);
