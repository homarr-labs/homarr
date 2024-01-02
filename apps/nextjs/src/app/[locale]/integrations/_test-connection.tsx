"use client";

import { useRef, useState } from "react";

import type { RouterInputs } from "@homarr/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { Anchor, Group, IconCheck, IconX, Loader } from "@homarr/ui";

import { api } from "~/trpc/react";

interface UseTestConnectionDirtyProps {
  defaultDirty: boolean;
  initialFormValue: {
    url: string;
    secrets: { kind: string; value: string | null }[];
  };
}

export const useTestConnectionDirty = ({
  defaultDirty,
  initialFormValue,
}: UseTestConnectionDirtyProps) => {
  const [isDirty, setIsDirty] = useState(defaultDirty);
  const prevFormValueRef = useRef(initialFormValue);

  return {
    onValuesChange: (values: typeof initialFormValue) => {
      if (isDirty) return;

      // If relevant values changed, set dirty
      if (
        prevFormValueRef.current.url !== values.url ||
        !prevFormValueRef.current.secrets
          .map((x) => x.value)
          .every((v, i) => values.secrets[i]?.value === v)
      ) {
        setIsDirty(true);
        return;
      }

      // If relevant values changed back to last tested, set not dirty
      setIsDirty(false);
    },
    isDirty,
    removeDirty: () => {
      prevFormValueRef.current = initialFormValue;
      setIsDirty(false);
    },
  };
};

interface TestConnectionProps {
  isDirty: boolean;
  removeDirty: () => void;
  integration: RouterInputs["integration"]["testConnection"] & { name: string };
}

export const TestConnection = ({
  integration,
  removeDirty,
  isDirty,
}: TestConnectionProps) => {
  const t = useScopedI18n("integration.action");
  const { mutateAsync, ...mutation } =
    api.integration.testConnection.useMutation();

  return (
    <Group>
      <Anchor
        type="button"
        component="button"
        onClick={async () => {
          await mutateAsync(integration, {
            onSuccess: () => {
              removeDirty();
              showSuccessNotification({
                title: "Connection test successful",
                message: `Integration ${integration.name} is working as expected`,
              });
            },
            onError: (error) => {
              if (error.data?.zodError?.fieldErrors.url) {
                showErrorNotification({
                  title: "Connection test failed",
                  message: "Invalid url provided",
                });
                return;
              }
              console.log(error.message);
              if (error.message === "SECRETS_NOT_DEFINED") {
                showErrorNotification({
                  title: "Connection test failed",
                  message: "Not all secrets were provided",
                });
                return;
              }
            },
          });
        }}
      >
        {t("testConnection")}
      </Anchor>
      <TestConnectionIcon isDirty={isDirty} {...mutation} size={20} />
    </Group>
  );
};

interface TestConnectionIconProps {
  isDirty: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  size: number;
}

const TestConnectionIcon = ({
  isDirty,
  isPending,
  isSuccess,
  isError,
  size,
}: TestConnectionIconProps) => {
  if (isPending) return <Loader color="blue" size={size} />;
  if (isDirty) return null;
  if (isSuccess) return <IconCheck size={size} stroke={1.5} color="green" />;
  if (isError) return <IconX size={size} stroke={1.5} color="red" />;
  return null;
};
