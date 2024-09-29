import Link from "next/link";
import { Button, Card, Center, Grid, GridCol, Stack, Text, Title } from "@mantine/core";

import { LanguageCombobox } from "~/components/language/language-combobox";
import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { ColorSchemeSelect } from "./_colorScheme";
import classes from "./init.module.css";

export default function OnboardingPage() {
  return (
    <Center>
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            New Homarr installation
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            Select the way you want to onboard Homarr
          </Text>
        </Stack>
        <Grid maw={64 * 12 + 16}>
          <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
            <Card className={classes.card} w={64 * 6} maw="90vw" p="xs">
              <ColorSchemeSelect />
            </Card>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
            <Card className={classes.card} w={64 * 6} maw="90vw" p="xs">
              <LanguageCombobox variant="unstyled" />
            </Card>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
            <Card className={classes.card} w={64 * 6} maw="90vw">
              <Stack justify="space-between" h="100%">
                <Stack>
                  <Text fw={500}>New setup</Text>
                  <Text>Start from scratch with a new setup and create your first board, apps and integrations.</Text>
                </Stack>
                <Button fullWidth>Continue new setup</Button>
              </Stack>
            </Card>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
            <Card className={classes.card} w={64 * 6} maw="90vw">
              <Stack justify="space-between" h="100%">
                <Stack>
                  <Text fw={500}>Existing setup</Text>
                  <Text>Use your existing setup and import boards and users.</Text>
                  <Text size="xs" c="gray.5">
                    This includes migration from Homarr before version 1.0.0
                  </Text>
                </Stack>
                <Button fullWidth component={Link} href="/init/existing">
                  Continue existing setup
                </Button>
              </Stack>
            </Card>
          </GridCol>
        </Grid>
      </Stack>
    </Center>
  );
}
