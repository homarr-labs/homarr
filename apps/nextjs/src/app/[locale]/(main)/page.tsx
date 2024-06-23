"use client";

import { Button, Stack, Title } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

export default function HomePage() {
  const { data } = clientApi.cronJobs.getJobs.useQuery();
  const { mutate } = clientApi.cronJobs.triggerJob.useMutation();
  clientApi.cronJobs.subscribeToStatusUpdates.useSubscription(undefined, {
    onData(data) {
      console.log(data);
    },
  });

  return (
    <Stack>
      <Title>Home</Title>

      <Button onClick={() => mutate("analytics")}>Run Analytics</Button>
      <Button onClick={() => mutate("iconsUpdater")}>Run Icons Updater</Button>

      {data?.map(({ name, expression }) => (
        <div key={name}>
          {name}: {expression}
        </div>
      ))}
    </Stack>
  );
}
