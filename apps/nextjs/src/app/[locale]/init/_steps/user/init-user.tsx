import { Card } from "@mantine/core";

import { InitUserForm } from "../../user/_init-user-form";

export const InitUser = () => {
  return (
    <Card w={64 * 6} maw="90vw">
      <InitUserForm />
    </Card>
  );
};
