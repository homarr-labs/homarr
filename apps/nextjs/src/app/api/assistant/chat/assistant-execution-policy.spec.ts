import { describe, expect, test } from "vitest";

import {
  appendActiveCustomWidgetToolInstruction,
  assistantExecutionPolicy,
  createCustomWidgetToolStepGate,
} from "./assistant-execution-policy";

describe("assistantExecutionPolicy", () => {
  test("allows a sizeable batch of tool calls to finish in one request", () => {
    expect(assistantExecutionPolicy.maxSteps).toBe(40);
    expect(assistantExecutionPolicy.maxRetries).toBe(2);
    expect(assistantExecutionPolicy.maxOutputTokens).toBe(32_768);
    expect(assistantExecutionPolicy.totalTimeoutMs).toBe(600_000);
    expect(assistantExecutionPolicy.stepTimeoutMs).toBe(90_000);
    expect(assistantExecutionPolicy.toolTimeoutMs).toBe(90_000);
  });
});

describe("createCustomWidgetToolStepGate", () => {
  test("batches independent context reads but keeps lifecycle tools exclusive", () => {
    const gate = createCustomWidgetToolStepGate();

    gate.begin(0);
    expect(gate.claim("customWidget_getSkill")).toBe(true);
    expect(gate.claim("web_search")).toBe(true);
    expect(gate.claim("homarr_enableToolGroups")).toBe(true);
    expect(gate.claim("customWidget_getReference")).toBe(true);
    expect(gate.claim("customWidget_list")).toBe(true);
    expect(gate.claim("customWidget_get")).toBe(true);
    expect(gate.claim("customWidget_getComponent")).toBe(true);
    expect(gate.claim("customWidget_getComponent")).toBe(false);
    expect(gate.claim("customWidget_validateTemplate")).toBe(false);

    gate.begin(1);
    expect(gate.claim("customWidget_validateTemplate")).toBe(true);
    expect(gate.claim("homarr_enableToolGroups")).toBe(false);
    expect(gate.claim("customWidget_previewCreate")).toBe(false);

    gate.begin(2);
    expect(gate.claim("customWidget_previewCreate")).toBe(true);
    expect(gate.claim("customWidget_previewCreate")).toBe(false);
  });

  test("does not reset when prepareStep repeats the same step number", () => {
    const gate = createCustomWidgetToolStepGate();

    gate.begin(3);
    expect(gate.claim("customWidget_previewQuery")).toBe(true);
    expect(gate.claim("customWidget_previewQuery")).toBe(true);
    gate.begin(3);
    expect(gate.claim("customWidget_previewAction")).toBe(false);
  });
});

test("makes the current authoring phase explicit without repeating inactive tools", () => {
  const instructions = appendActiveCustomWidgetToolInstruction("Base policy", [
    "customWidget_validateTemplate",
    "customWidget_previewCreate",
  ]);

  expect(instructions).toContain("preview queries may run together");
  expect(instructions).toContain("customWidget_previewCreate");
  expect(instructions).toContain("Provider server tools such as web_search");
  expect(instructions).toContain("unlisted function tool");
  expect(instructions).not.toContain("customWidget_getComponents");
});
