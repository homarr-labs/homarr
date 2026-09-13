import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Alert, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

export class RendererErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onError(error: Error): void },
  { error: Error | null; resetKey: string }
> {
  public state = { error: null, resetKey: "" } as { error: Error | null; resetKey: string };
  public static getDerivedStateFromProps(
    props: Readonly<{ resetKey: string }>,
    state: Readonly<{ error: Error | null; resetKey: string }>,
  ) {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }
  public static getDerivedStateFromError(error: Error) {
    return { error };
  }
  public componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }
  public render() {
    return this.state.error ? <ErrorAlert error={this.state.error} /> : this.props.children;
  }
}

export function ErrorAlert({ error }: { error: Error }) {
  return (
    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
      <Text size="xs" fw={700}>
        RUNTIME_RENDER_ERROR
      </Text>
      <Text size="xs">{error.message}</Text>
    </Alert>
  );
}

export function createBoundaryKey(
  template: string,
  bindings: Readonly<Record<string, unknown>>,
  fragments?: Readonly<Record<string, string>>,
) {
  let hash = 0;
  const value = `${template}\0${JSON.stringify(bindings)}\0${JSON.stringify(fragments)}`;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return `${template.length}:${hash}`;
}
