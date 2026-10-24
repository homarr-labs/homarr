import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.ROOT ?? process.cwd());
const prompt = await import(`${root}/packages/custom-widgets/src/core/ai-prompt.ts`);
const policy = await import(`${root}/apps/nextjs/src/app/api/assistant/chat/assistant-tool-policy.ts`);
const resources = await import(`${root}/packages/custom-widgets/src/core/authoring-resources.ts`);
const draft = {
  name: "Status",
  sources: { default: { baseUrl: "https://status.example.test", auth: "none" } },
  requests: { status: { path: "/status" } },
  options: {},
  template: '<Stack><Text>{data.status?.name ?? "Unknown"}</Text></Stack>',
};

console.log(
  JSON.stringify(
    {
      revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      sourceSha256: Object.fromEntries(
        await Promise.all(
          [
            "packages/custom-widgets/src/core/ai-prompt.ts",
            "packages/custom-widgets/src/core/authoring-resources.ts",
            "apps/nextjs/src/app/api/assistant/chat/assistant-tool-policy.ts",
          ].map(async (file) => [
            file,
            createHash("sha256")
              .update(await readFile(path.join(root, file)))
              .digest("hex"),
          ]),
        ),
      ),
      unit: "JavaScript UTF-16 code units, not tokens",
      componentReferenceChars: resources.CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE.length,
      widgetInstructionsChars: policy.customWidgetAssistantInstructions.length,
      assistantPolicyChars: prompt.CUSTOM_WIDGET_ASSISTANT_POLICY.length,
      workbenchMessageChars: prompt.buildCustomWidgetAssistantPrompt(
        undefined,
        JSON.stringify({ name: "Ready" }),
        draft,
        "Show the status with latency",
        "https://status.example.test/docs",
        [],
      ).length,
    },
    null,
    2,
  ),
);
