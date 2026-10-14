import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink, IconShield } from "@tabler/icons-react";

import { WorkshopAccountButton } from "../../source-ui/workshop";
import { useWorkshopFeature } from "./scope";

export function WorkshopModeration({
  workshopModerationUrl,
  onBack,
}: {
  workshopModerationUrl?: string;
  onBack?(): void;
}) {
  const { transport } = useWorkshopFeature();
  const user = transport.kind === "available" ? transport.client.currentUser : null;
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Workshop moderation</Title>
        <WorkshopAccountButton name={user?.name} hold="Workshop account lifecycle is not joined in this preview." />
      </Group>
      <Text size="sm" c="dimmed">
        Review reports and remove unsafe or outdated submissions. PocketBase rules enforce every action.
      </Text>
      {!user && (
        <Alert color="yellow" icon={<IconShield size={18} />} title="Sign in to moderate the Workshop">
          Moderator access is checked against your GitHub-linked Workshop account. Homarr administrator access does not
          grant Workshop moderation.
        </Alert>
      )}
      {user && !user.isAdmin && (
        <Alert color="red" icon={<IconShield size={18} />} title="Workshop moderator access required">
          This Workshop account cannot access moderation.
        </Alert>
      )}
      <Alert color="yellow" title="Original moderation workflow is held">
        The original community moderation screen belongs to the separate documentation Workshop application. Its report
        grouping, reporter identities, dismissal, deletion confirmation, comments and screenshot authoring have not been
        joined here. No reports, moderator identity or successful actions are simulated.
      </Alert>
      <Group>
        {onBack && (
          <Button variant="default" onClick={onBack}>
            Back to Workshop
          </Button>
        )}
        {workshopModerationUrl && (
          <Button
            component="a"
            href={workshopModerationUrl}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={16} />}
          >
            Open original Workshop moderation
          </Button>
        )}
      </Group>
    </Stack>
  );
}
