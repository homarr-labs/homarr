import { Grid } from "@mantine/core";

import { InitPreferencesRow } from "../_components/init-preferences-row";
import { InitTitle } from "../_components/init-title";
import { InitExternalAdminGroupForm } from "./admin-group-form";

export default function InitExternalAdminGroup() {
  return (
    <>
      <InitTitle
        title="Add admin group for ldap/oidc"
        description="Create the group that should be linked to the admin group in your external authentication provider"
      />
      <Grid maw={64 * 12 + 16}>
        <InitPreferencesRow />
        <InitExternalAdminGroupForm />
      </Grid>
    </>
  );
}
