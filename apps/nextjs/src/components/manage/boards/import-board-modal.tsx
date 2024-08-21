import { useState } from "react";
import { Button, FileInput, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";

interface InnerProps {
  boardNames: string[];
}

export const ImportBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const [file, setFile] = useState<File | null>(null);
  const { mutate } = clientApi.board.importOldmarrConfig.useMutation();

  return (
    <Stack>
      <FileInput accept="application/json" value={file} onChange={(file) => setFile(file)} label="Select JSON file" />

      <Button
        onClick={async () => {
          if (file) {
            const content = await file.text();
            const formData = new FormData();
            formData.set("file", file);
            mutate(content, {
              onSuccess() {
                actions.closeModal();
              },
            });
          }
        }}
      >
        Import
      </Button>
    </Stack>
  );
}).withOptions({});
