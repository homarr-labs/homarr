import type { AnyProcedure, AnyRouter } from "@orpc/server";
import { walkProcedureContractsSync } from "@orpc/server";

import type { BackendContribution } from "../contribution";
import { backendContractRevision } from "../context";
import { getSourceProcedureMeta, getSourceProjectionMeta } from "../procedure";
import type { SourceProcedureDescriptor } from "../procedure";
import { selectedMcpDescriptions } from "./mcp-descriptions";
import { getSelectedMcpSourceRow, getSelectedRestOperation, selectedRestSourceRows } from "./source-selection";
import type { SelectedSourcePath } from "./source-selection";

export interface NativeProtocolSelection<TProcedure extends AnyProcedure> {
  readonly revision: typeof backendContractRevision;
  readonly contributionId: string;
  readonly path: SelectedSourcePath;
  readonly source: SourceProcedureDescriptor;
  readonly procedure: TProcedure;
}

export type ProtocolHoldReason =
  | "not_selected"
  | "metadata_missing"
  | "metadata_drift"
  | "resource_bindings_missing"
  | "security_unverified"
  | "stream_or_binary_result"
  | "wire_contract_unverified"
  | "unsupported_input"
  | "invalid_schema"
  | "duplicate_identity";

export type ProtocolProjection<TProjection> =
  | { readonly kind: "private_unavailable"; readonly reason: ProtocolHoldReason }
  | { readonly kind: "available"; readonly projection: TProjection };

export function unavailableProjection(reason: ProtocolHoldReason) {
  return Object.freeze({ kind: "private_unavailable", reason } as const);
}

export function selectNativeProtocolProcedure<TRouter extends AnyRouter, TProcedure extends AnyProcedure>(options: {
  readonly contribution: BackendContribution<TRouter>;
  readonly path: SelectedSourcePath;
  select(router: TRouter): TProcedure;
}): NativeProtocolSelection<TProcedure> {
  const { contribution, path } = options;
  if (contribution.revision !== backendContractRevision || !contribution.leaves.includes(path)) {
    throw new Error("Selected procedure is not a declared native contribution leaf");
  }
  const procedure = options.select(contribution.router);
  const source = getSourceProcedureMeta(procedure);
  const row = getSelectedMcpSourceRow(path) ?? selectedRestSourceRows.find((candidate) => candidate[0] === path);
  if (!row || !source || source.path !== path || source.kind !== (row[1] === "Q" ? "query" : "mutation")) {
    throw new Error("Selected procedure does not preserve its source identity");
  }
  let matches = 0;
  const lazy = walkProcedureContractsSync(contribution.router, (candidate, candidatePath) => {
    if (candidate === procedure && candidatePath.join(".") === path) matches++;
  });
  if (lazy.length > 0 || matches !== 1) {
    throw new Error("Selected procedure must be an explicit native contribution member");
  }
  if (procedure["~orpc"].disableInputValidation || procedure["~orpc"].disableOutputValidation) {
    throw new Error("Selected protocols require native input and output validation");
  }
  return Object.freeze({
    revision: backendContractRevision,
    contributionId: contribution.id,
    path,
    source: Object.freeze({ ...source, access: Object.freeze({ ...source.access }) }),
    procedure,
  });
}

export function describeSelectedRest<TProcedure extends AnyProcedure>(selection: NativeProtocolSelection<TProcedure>) {
  const operation = getSelectedRestOperation(selection.path);
  if (!operation) return unavailableProjection("not_selected");
  const metadata = getSourceProjectionMeta(selection.procedure)?.openapi;
  if (!metadata) return unavailableProjection("metadata_missing");
  if (
    metadata.enabled === false ||
    metadata.method !== operation[1] ||
    metadata.path !== operation[2] ||
    metadata.protect !== true
  ) {
    return unavailableProjection("metadata_drift");
  }
  const optionalAuthentication = selection.path === "board.getAllBoards" || selection.path === "app.byId";
  return Object.freeze({
    kind: "available",
    projection: Object.freeze({
      protocol: "rest",
      sourcePath: selection.path,
      operationId: operation[0],
      method: operation[1],
      path: operation[2],
      summary: metadata.summary,
      description: metadata.description,
      tags: Object.freeze([...(metadata.tags ?? [])]),
      deprecated: metadata.deprecated,
      authentication: optionalAuthentication ? "optionalApiKey" : "apiKey",
    }),
  } as const);
}

export function describeSelectedMcp<TProcedure extends AnyProcedure>(selection: NativeProtocolSelection<TProcedure>) {
  const row = getSelectedMcpSourceRow(selection.path);
  if (!row) return unavailableProjection("not_selected");
  const metadata = getSourceProjectionMeta(selection.procedure)?.mcp;
  if (!metadata) return unavailableProjection("metadata_missing");
  const description = selectedMcpDescriptions[row[4]];
  if (
    !metadata.enabled ||
    (metadata.name !== undefined && metadata.name !== row[4]) ||
    metadata.description !== description
  ) {
    return unavailableProjection("metadata_drift");
  }
  return Object.freeze({
    kind: "available",
    projection: Object.freeze({
      protocol: "mcp",
      sourcePath: selection.path,
      name: row[4],
      description,
      type: row[1] === "Q" ? "query" : "mutation",
      authentication: "apiKey",
      visibility: selection.path.startsWith("customWidget.") ? "admin" : "authenticated",
    }),
  } as const);
}

export type SelectedRestDescriptor = Extract<
  ReturnType<typeof describeSelectedRest>,
  { kind: "available" }
>["projection"];
export type SelectedMcpDescriptor = Extract<
  ReturnType<typeof describeSelectedMcp>,
  { kind: "available" }
>["projection"];

export function checkSelectedProtocolIdentities(
  descriptors: readonly (SelectedRestDescriptor | SelectedMcpDescriptor)[],
) {
  const identities = new Set<string>();
  const paths = new Set<string>();
  for (const descriptor of descriptors) {
    const identity = descriptor.protocol === "rest" ? `${descriptor.method} ${descriptor.path}` : descriptor.name;
    const key = `${descriptor.protocol}:${identity}`;
    const sourceKey = `${descriptor.protocol}:${descriptor.sourcePath}`;
    if (identities.has(key) || paths.has(sourceKey)) return unavailableProjection("duplicate_identity");
    identities.add(key);
    paths.add(sourceKey);
  }
  return Object.freeze({ kind: "available", projection: Object.freeze([...descriptors]) } as const);
}
