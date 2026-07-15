import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Button, Card, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export interface PreviewErrorBoundaryProps {
  children: ReactNode;
  title: string;
  description: string;
  retryLabel: string;
}

export class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, { hasError: boolean }> {
  public state = { hasError: false };
  public static getDerivedStateFromError() {
    return { hasError: true };
  }
  public componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Imported templates and response data are intentionally not logged.
  }
  public render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Card p="xl" role="alert">
        <Stack align="center" gap="sm" py="xl">
          <IconAlertTriangle size={28} color="var(--mantine-color-red-6)" />
          <div>
            <Text fw={600} ta="center">
              {this.props.title}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={480}>
              {this.props.description}
            </Text>
          </div>
          <Button type="button" variant="light" onClick={() => this.setState({ hasError: false })}>
            {this.props.retryLabel}
          </Button>
        </Stack>
      </Card>
    );
  }
}
