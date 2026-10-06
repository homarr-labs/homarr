"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface FormErrorBoundaryState {
  error: Error | null;
}

interface FormErrorBoundaryProps {
  children: ReactNode;
}

export class FormErrorBoundary extends Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  public state: FormErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("Custom widget form error:", error);
  }

  public render() {
    if (this.state.error) {
      return <FormErrorFallback error={this.state.error} reset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function FormErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="md">
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {t("editor.errorBoundary.title")}
        </Text>
        <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
          {error.message}
        </Text>
        <Button size="xs" variant="light" color="red" onClick={reset}>
          {tCommon("action.tryAgain")}
        </Button>
      </Stack>
    </Alert>
  );
}
