export interface WidgetInvocationContext {
  instanceId: string;
  boardId: string;
  userId?: string;
}

export interface WidgetSdkInvocation {
  operation: string;
  input: unknown;
  context: WidgetInvocationContext;
  /** Aborts on completion, retirement, timeout or worker failure; never sent over IPC. */
  signal?: AbortSignal;
}

export type WidgetSdkCallback = (invocation: WidgetSdkInvocation) => Promise<unknown>;

export type WidgetHostMessage =
  | { type: "invoke"; id: string; handler: string; kind: string; input: unknown; context: WidgetInvocationContext }
  | { type: "cancel"; id: string }
  | { type: "sdk-result"; id: string; value?: unknown; error?: string; errorCode?: string }
  | { type: "shutdown" };

export type WidgetChildMessage =
  | { type: "ready"; handlers: string[] }
  | { type: "heartbeat" }
  | { type: "result"; id: string; value?: unknown; error?: string; errorCode?: string }
  | { type: "event"; id: string; value: unknown }
  | { type: "sdk"; id: string; invocationId: string; operation: string; input: unknown }
  | { type: "fatal"; error: string };
