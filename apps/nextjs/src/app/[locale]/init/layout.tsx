import type { PropsWithChildren } from "react";
import { Flex, Stack } from "@mantine/core";

import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";

export default function Layout(props: PropsWithChildren) {
  return (
    <Flex h="100dvh" justify="center">
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        {props.children}
      </Stack>
    </Flex>
  );
}
