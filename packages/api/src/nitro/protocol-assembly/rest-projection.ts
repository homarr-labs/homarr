import type { AnySchema, Context, ErrorMap, Procedure, StandardResponse } from "@orpc/server";
import type { AnyORPCError, StandardLazyRequest } from "@orpc/server";

import type { BackendContext, BackendRequestResources } from "../context";
import type { ProtocolAdmissionRequirements, ProtocolResourceBindings, SelectedProtocolPolicy } from "./admission";
import { unavailableProjection } from "./selection";
import type { NativeProtocolSelection, SelectedRestDescriptor } from "./selection";

export interface SelectedRestBindings<
  TContext extends BackendContext,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
> extends ProtocolResourceBindings<TContext> {
  decodeInput(
    request: StandardLazyRequest,
    pathParameters: Readonly<Record<string, string>>,
    descriptor: SelectedRestDescriptor,
    schema: TInputSchema | undefined,
  ): Promise<unknown>;
  encodeOutput(
    output: unknown,
    descriptor: SelectedRestDescriptor,
    context: TContext,
    schema: TOutputSchema | undefined,
  ): Promise<StandardResponse>;
  encodeError(error: AnyORPCError, descriptor: SelectedRestDescriptor, context: TContext): Promise<StandardResponse>;
  encodeAdmissionError(
    error: unknown,
    resources: BackendRequestResources,
    policy: SelectedProtocolPolicy,
  ): Promise<Response>;
}

export function matchSelectedRestPath(
  template: string,
  pathname: string,
): Readonly<Record<string, string>> | undefined {
  const expected = `/${template.replace(/^\/|\/$/g, "")}`.split("/");
  const received = `/${pathname.replace(/^\/|\/$/g, "")}`.split("/");
  if (expected.length !== received.length) return undefined;
  const parameters: Record<string, string> = {};
  for (const [index, segment] of expected.entries()) {
    const value = received[index];
    if (value === undefined) return undefined;
    if (segment.startsWith("{") && segment.endsWith("}")) {
      if (!value) return undefined;
      parameters[segment.slice(1, -1)] = value;
    } else if (segment.toLowerCase() !== value.toLowerCase()) {
      return undefined;
    }
  }
  return Object.freeze(parameters);
}

export function projectSelectedRest<
  TContext extends BackendContext,
  TCurrentContext extends Context,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
>(_options: {
  readonly selection: NativeProtocolSelection<
    Procedure<TContext, TCurrentContext, TInputSchema, TOutputSchema, TErrorMap>
  >;
  readonly requirements: ProtocolAdmissionRequirements;
  readonly bindings: SelectedRestBindings<TContext, TInputSchema, TOutputSchema> | undefined;
}) {
  return unavailableProjection("security_unverified");
}
