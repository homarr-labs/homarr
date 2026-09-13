"use client";

import type { PropsWithChildren } from "react";
import { Component } from "react";
import { Alert, Button, Stack, Text } from "@mantine/core";

export class TrustedWidgetErrorBoundary extends Component<
  PropsWithChildren<{ title: string; retryLabel: string; onRetry(): void; onError?(error: Error): void }>,
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: unknown) {
    if (error instanceof Error) return { error };
    return { error: new Error(String(error)) };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error)
      return (
        <Alert color="red" title={this.props.title}>
          <Stack gap="xs">
            <Text size="sm">{this.state.error.message}</Text>
            <Button size="compact-xs" onClick={this.props.onRetry}>
              {this.props.retryLabel}
            </Button>
          </Stack>
        </Alert>
      );
    return this.props.children;
  }
}
