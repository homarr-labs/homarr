import Link from "next/link";
import { Button, Card, Center, Grid, GridCol, Stack, Text, Title } from "@mantine/core";

import { LanguageCombobox } from "~/components/language/language-combobox";
import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { ColorSchemeSelect } from "../_colorScheme";
import classes from "../init.module.css";

export default function ExistingSetupOnboardingPage() {
  return (
    <Center>
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            Setup existing Homarr installation
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            Select from where you want to onboard Homarr
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
                  <Text fw={500}>After version 1.0.0</Text>
                  <Text>Import your Homarr backup from after version 1.0.0</Text>
                </Stack>
                <Button fullWidth>Continue with after 1.0.0</Button>
              </Stack>
            </Card>
          </GridCol>
          <GridCol span={{ base: 12, md: 6 }} display="flex" style={{ justifyContent: "center" }}>
            <Card className={classes.card} w={64 * 6} maw="90vw">
              <Stack justify="space-between" h="100%">
                <Stack>
                  <Text fw={500}>Before version 1.0.0</Text>
                  <Text>Import your Homarr boards and users from before version 1.0.0</Text>
                </Stack>
                <Button fullWidth component={Link} href="/init/import/old/boards">
                  Continue with before 1.0.0
                </Button>
              </Stack>
            </Card>
          </GridCol>
        </Grid>
      </Stack>
    </Center>
  );
}
