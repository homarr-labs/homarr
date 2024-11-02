import { Grid } from "@mantine/core";

import { InitPreferencesRow } from "../../../_components/init-preferences-row";
import { InitTitle } from "../../../_components/init-title";
import { ImportBoards } from "./_drop-zone";

export default function ImportBoardsOnboardingPage() {
  return (
    <>
      <InitTitle
        title="Import boards from before version 1.0.0"
        description="Drop the zip file with your exported boards in the dropzone below"
      />
      <Grid maw={64 * 12 + 16}>
        <InitPreferencesRow />
        <ImportBoards />
      </Grid>
    </>
  );
}
