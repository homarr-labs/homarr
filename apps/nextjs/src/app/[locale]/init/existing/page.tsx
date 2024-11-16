import { Grid } from "@mantine/core";

import { InitGridColCard } from "../_components/init-card";
import { InitPreferencesRow } from "../_components/init-preferences-row";
import { InitTitle } from "../_components/init-title";

export default function ExistingSetupOnboardingPage() {
  return (
    <>
      <InitTitle
        title="Setup existing Homarr installation"
        description="Select from where you want to onboard Homarr"
      />
      <Grid maw={64 * 12 + 16}>
        <InitPreferencesRow />
        <InitGridColCard>
          <InitGridColCard.Content
            title="After version 1.0.0"
            description="Import your Homarr backup from after version 1.0.0"
            buttonProps={{ label: "Continue with after 1.0.0", href: "/init/import/after" }}
          />
        </InitGridColCard>
        <InitGridColCard>
          <InitGridColCard.Content
            title="Before version 1.0.0"
            description="Import your Homarr boards and users from before version 1.0.0"
            buttonProps={{ label: "Continue with before 1.0.0", href: "/init/import/old/boards" }}
          />
        </InitGridColCard>
      </Grid>
    </>
  );
}
