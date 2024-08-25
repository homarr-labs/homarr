import { useState } from "react";
import { Button, FileInput, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";

import type { OldmarrConfig } from "../../../../../../packages/old-schema/src";

interface InnerProps {
  boardNames: string[];
}

export const ImportBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = clientApi.board.importOldmarrConfig.useMutation();
  const form = useForm<{ file: File | null; boardName: string }>({
    validateInputOnBlur: true,
    validateInputOnChange: true,
    validate: {
      // eslint-disable-next-line no-restricted-syntax
      async file(value, values, path) {
        if (!value) {
          return "File is required";
        }

        if (value.type !== "application/json") {
          return "File must be a JSON file";
        }

        try {
          const content = JSON.parse(await value.text()) as OldmarrConfig;

          if (!("configProperties" in content)) {
            return "Invalid oldmarr config";
          }

          if (!("name" in content.configProperties)) {
            return "Invalid oldmarr config";
          }
        } catch {
          return "File must be a valid JSON file";
        }
      },
    },
  });

  return (
    <form>
      <Stack>
        <FileInput accept="application/json" {...form.getInputProps("file")} type="button" label="Select JSON file" />

        <Button
          onClick={async () => {
            if (file) {
              const formData = new FormData();
              formData.set("file", file);

              const content = await file.text();
              const oldmarrConfig = JSON.parse(content) as OldmarrConfig;

              const boardName = oldmarrConfig.configProperties.name;

              mutate(formData, {
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
    </form>
  );
}).withOptions({});
