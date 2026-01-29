"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { IconBrandDocker } from "@tabler/icons-react";
import { ImportDockerModal } from "./import-docker-modal";

export const DockerImportButton = () => {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button 
        leftSection={<IconBrandDocker size={20} />} 
        variant="light" 
        onClick={() => setOpened(true)}
      >
        Import from Docker
      </Button>

      <ImportDockerModal opened={opened} onClose={() => setOpened(false)} />
    </>
  );
};