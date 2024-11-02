import { Grid } from "@mantine/core";

import { InitGridColCard } from "./_components/init-card";
import { InitPreferencesRow } from "./_components/init-preferences-row";
import { InitTitle } from "./_components/init-title";

export default function OnboardingPage() {
  return (
    <>
      <InitTitle title="New Homarr installation" description="Select the way you want to onboard Homarr" />
      <Grid maw={64 * 12 + 16}>
        <InitPreferencesRow />

        <InitGridColCard>
          <InitGridColCard.Content
            title="New setup"
            description="Start from scratch with a new setup and create your first board, apps and integrations."
            buttonProps={{ label: "Continue new setup", href: "/init/new" }}
          />
        </InitGridColCard>
        <InitGridColCard>
          <InitGridColCard.Content
            title="Existing setup"
            description="Use your existing setup and import boards and users."
            note="This includes migration from Homarr before version 1.0.0"
            buttonProps={{ label: "Continue existing setup", href: "/init/existing" }}
          />
        </InitGridColCard>
      </Grid>
    </>
  );
}
