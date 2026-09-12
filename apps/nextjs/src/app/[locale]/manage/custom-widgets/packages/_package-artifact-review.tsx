"use client";

import { useState } from "react";
import { Accordion, Select, Stack, Text } from "@mantine/core";
import type { CustomWidgetArtifact } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import { CodeEditor } from "~/components/custom-widgets/code-editor";

export function PackageArtifactReview({ artifact }: { artifact: CustomWidgetArtifact }) {
  const t = useI18n("customWidget.package.artifactReview");
  const [selected, setSelected] = useState("dependency-lock.json");
  const files: Record<string, string> = { "dependency-lock.json": JSON.stringify(artifact.dependencyLock, null, 2) };
  for (const [surface, compiled] of Object.entries(artifact.client)) {
    if (!compiled) continue;
    files[`${surface}.js`] = compiled.javascript;
    if (compiled.css) files[`${surface}.css`] = compiled.css;
  }
  if (artifact.server) files["server.js"] = artifact.server;
  const path = Object.hasOwn(files, selected) ? selected : "dependency-lock.json";
  return (
    <Accordion>
      <Accordion.Item value="artifact">
        <Accordion.Control>{t("title")}</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <Text size="sm">{t("description")}</Text>
            <Text size="xs" ff="monospace" style={{ overflowWrap: "anywhere" }}>
              {artifact.digest}
            </Text>
            <Select
              label={t("file")}
              value={path}
              data={Object.keys(files)}
              onChange={(value) => {
                if (value) setSelected(value);
              }}
            />
            <CodeEditor
              id={`artifact-${artifact.digest}-${path}`}
              label={path}
              value={files[path] ?? ""}
              language={path.endsWith(".json") ? "json" : path.endsWith(".css") ? "css" : "tsx"}
              readOnly
              height="320px"
              onChange={() => undefined}
            />
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
