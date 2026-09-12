"use client";

import { useState } from "react";
import { Alert, Button, Checkbox, Group, Paper, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { useWorkshopSubmissionQuery } from "@homarr/workshop/backend";

import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";

export function PackageWorkshop({ id, dirty }: { id: string; dirty: boolean }) {
  const t = useI18n("customWidget.package");
  const session = useWorkshopSession();
  const update = clientApi.customWidget.package.checkUpdate.useQuery({ id });
  const stage = clientApi.customWidget.package.stageWorkshopUpdate.useMutation();
  const publish = clientApi.customWidget.package.publishWorkshop.useMutation();
  const [replace, setReplace] = useState(false);
  const [mode, setMode] = useState<"new" | "update" | "fork">("new");
  const [changelog, setChangelog] = useState("");
  const [forkedFrom, setForkedFrom] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const updateData = update.data;
  const linked = updateData?.origin !== undefined;
  let submissionId = "";
  if (linked) submissionId = updateData.origin.submissionId;
  const submission = useWorkshopSubmissionQuery(session.client, submissionId);
  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{t("workshopLifecycle")}</Text>
        {update.error && <Alert color="yellow">{update.error.message}</Alert>}
        <Button variant="subtle" onClick={() => void update.refetch()}>
          {t("checkUpdates")}
        </Button>
        {linked && (
          <>
            <Text size="sm">{t("upstreamRelease", { version: updateData.origin.version })}</Text>
            {updateData.hasLocalChanges && <Alert color="yellow">{t("localChanges")}</Alert>}
            {updateData.available && updateData.latest && (
              <Stack gap="xs">
                <Text fw={500}>{t("updateAvailable", { version: updateData.latest.version })}</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {updateData.latest.changelog}
                </Text>
                <Checkbox
                  checked={replace}
                  onChange={(event) => setReplace(event.currentTarget.checked)}
                  label={t("replaceDraft")}
                />
                <Button
                  disabled={!replace || dirty}
                  loading={stage.isPending}
                  onClick={() => {
                    if (!updateData.latest) return;
                    stage.mutate(
                      {
                        id,
                        releaseId: updateData.latest.id,
                        replaceLocalDraft: true,
                        expectedDraftDigest: updateData.draftDigest,
                      },
                      { onSuccess: (result) => window.location.assign(result.managementPath) },
                    );
                  }}
                >
                  {t("stageWorkshopUpdate")}
                </Button>
              </Stack>
            )}
          </>
        )}
        <Group justify="space-between">
          <Text fw={600}>{t("publishWorkshop")}</Text>
          <WorkshopAccountButton session={session} />
        </Group>
        <Select
          label={t("publishMode")}
          value={mode}
          onChange={(value) => {
            if (value === "new" || value === "update" || value === "fork") setMode(value);
          }}
          data={[
            { value: "new", label: t("publishNew") },
            { value: "update", label: t("publishUpdate") },
            { value: "fork", label: t("publishFork") },
          ]}
        />
        {mode === "fork" && (
          <TextInput
            label={t("forkedFrom")}
            value={forkedFrom}
            onChange={(event) => setForkedFrom(event.currentTarget.value)}
          />
        )}
        <Textarea
          label={t("changelog")}
          value={changelog}
          onChange={(event) => setChangelog(event.currentTarget.value)}
          autosize
          minRows={3}
        />
        <Checkbox
          checked={reviewed}
          onChange={(event) => setReviewed(event.currentTarget.checked)}
          label={t("publishAcknowledgement")}
        />
        <Button
          disabled={!session.user || dirty || !reviewed || (mode === "update" && !submission.data)}
          loading={publish.isPending}
          onClick={() => {
            const token = session.client.authToken;
            if (!token) return;
            publish.mutate(
              {
                id,
                token,
                mode,
                submissionId: submissionId || undefined,
                expectedRevision: submission.data?.revision,
                forkedFrom: forkedFrom || undefined,
                changelog,
              },
              {
                onSuccess: () => {
                  setReviewed(false);
                  void update.refetch();
                },
              },
            );
          }}
        >
          {t("publishWorkshop")}
        </Button>
        {publish.data && (
          <Alert color="green">
            <Text>{t("published", { version: publish.data.version })}</Text>
            <Button
              component="a"
              href={publish.data.workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
            >
              {t("openWorkshop")}
            </Button>
          </Alert>
        )}
        {stage.error && <Alert color="red">{stage.error.message}</Alert>}
        {publish.error && <Alert color="red">{publish.error.message}</Alert>}
      </Stack>
    </Paper>
  );
}
