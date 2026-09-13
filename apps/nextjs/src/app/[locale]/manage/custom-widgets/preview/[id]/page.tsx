import { notFound, redirect } from "next/navigation";
import { Badge, Box, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";

export default async function CustomWidgetPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect("/");
  const { id } = await params;
  const preview = await api.customWidget.previewGet({ sessionId: id }).catch(() => null);
  if (!preview) notFound();

  const pendingRequests = [
    ...preview.requests
      .filter((request) => request.kind === "query" && request.trigger === "load")
      .map((request) => ({ id: request.id, native: false })),
    ...Object.entries(preview.extensions?.native ?? {})
      .filter(([, capability]) => capability.kind === "query" && capability.trigger === "load")
      .map(([nativeId]) => ({ id: nativeId, native: true })),
  ];
  const data: Record<string, unknown> = {};
  const status: Record<string, unknown> = {};
  const worker = async () => {
    while (true) {
      const request = pendingRequests.shift();
      if (!request) return;
      try {
        let result;
        if (request.native) {
          result = await api.customWidget.nativeQuery({ previewSessionId: id, nativeId: request.id, params: {} });
        } else {
          result = await api.customWidget.previewQuery({ sessionId: id, requestId: request.id, params: {} });
        }
        data[request.id] = result.data;
        status[request.id] = { loading: false, ok: result.ok, status: result.status, error: result.error };
      } catch (cause) {
        data[request.id] = null;
        status[request.id] = {
          loading: false,
          ok: false,
          status: 0,
          error: cause instanceof Error ? cause.message : "Request failed",
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pendingRequests.length) }, worker));

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
              extensions: preview.extensions,
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
