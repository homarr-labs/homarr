import { Card, Center, Grid, GridCol, Stack, Text, Title } from "@mantine/core";

import { LanguageCombobox } from "~/components/language/language-combobox";
import { HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";
import { ColorSchemeSelect } from "../../../_colorScheme";
import classes from "../../../init.module.css";
import { ImportBoards } from "./_drop-zone";

export default function ImportBoardsOnboardingPage() {
  return (
    <Center>
      <Stack align="center" mt="xl">
        <HomarrLogoWithTitle size="lg" />
        <Stack gap={6} align="center">
          <Title order={3} fw={400} ta="center">
            Import boards from before version 1.0.0
          </Title>
          <Text size="sm" c="gray.5" ta="center">
            Drop the zip file with your exported boards in the dropzone below
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
          <ImportBoards />
        </Grid>
      </Stack>
    </Center>
  );
}
