import { notFound, redirect } from "next/navigation";
import { Badge, Box, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { resolveCustomWidgetOptionsBinding } from "@homarr/custom-widgets/core";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";

export default async function CustomWidgetPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("custom-widget-manage")) redirect("/");
  const { id } = await params;
  const preview = await api.customWidget.previewGet({ sessionId: id }).catch(() => null);
  if (!preview) notFound();

  const loadRequests = preview.requests.filter((request) => request.kind === "query" && request.trigger === "load");
  const results = await Promise.all(
    loadRequests.map(async (request) => {
      const result = await Promise.resolve()
        .then(() => resolveCustomWidgetOptionsBinding(request, preview.options))
        .then((requestParams) =>
          api.customWidget.previewQuery({ sessionId: id, requestId: request.id, params: requestParams }),
        )
        .catch((cause: unknown) => ({
          ok: false,
          status: 0,
          statusText: "Error",
          data: null,
          error: cause instanceof Error ? cause.message : "Request failed",
        }));
      return [request.id, result] as const;
    }),
  );
  const data = Object.fromEntries(results.map(([requestId, result]) => [requestId, result.data]));
  const status = Object.fromEntries(
    results.map(([requestId, result]) => [
      requestId,
      { loading: false, ok: result.ok, status: result.status, error: result.error },
    ]),
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <Box>
            <Text size="sm" c="dimmed" fw={600}>
              CUSTOM WIDGET PREVIEW
            </Text>
            <Title>{preview.name}</Title>
          </Box>
          <Badge variant="light">Expires {new Date(preview.expiresAt).toLocaleTimeString()}</Badge>
        </Group>
        <Paper withBorder radius="lg" p="md" mih={360} style={{ overflow: "auto" }}>
          <CustomJsxDisplay
            data={{
              template: preview.template,
              data,
              status,
              options: preview.options,
              requestCapabilities: preview.requests,
              previewSessionId: preview.id,
              previewLiveActions: preview.liveActions,
            }}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
