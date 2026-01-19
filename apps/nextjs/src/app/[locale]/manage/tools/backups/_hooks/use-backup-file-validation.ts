import { useCallback, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

type ValidationResult = RouterOutputs["backup"]["validate"];

interface UseBackupFileValidationOptions {
  validateMutation: {
    mutate: (
      params: { fileContent: string },
      options?: { onSuccess: (result: ValidationResult) => void; onError: () => void },
    ) => void;
    isPending: boolean;
  };
}

interface UseBackupFileValidationReturn {
  fileContent: string | null;
  validation: ValidationResult | null;
  isPending: boolean;
  handleFileDrop: (files: File[]) => Promise<void>;
  reset: () => void;
}

export const useBackupFileValidation = ({
  validateMutation,
}: UseBackupFileValidationOptions): UseBackupFileValidationReturn => {
  const tBackup = useScopedI18n("backup");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const handleFileDrop = useCallback(
    (files: File[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        const file = files[0];
        if (!file) {
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(",")[1];
          if (!base64) {
            resolve();
            return;
          }

          setFileContent(base64);

          validateMutation.mutate(
            { fileContent: base64 },
            {
              onSuccess: (result) => {
                setValidation(result);
                resolve();
              },
              onError: () => {
                showErrorNotification({
                  title: tBackup("action.restore.validation.error.title"),
                  message: tBackup("action.restore.validation.error.message"),
                });
                reject(new Error("Validation failed"));
              },
            },
          );
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    [validateMutation, tBackup],
  );

  const reset = useCallback(() => {
    setFileContent(null);
    setValidation(null);
  }, []);

  return {
    fileContent,
    validation,
    isPending: validateMutation.isPending,
    handleFileDrop,
    reset,
  };
};
