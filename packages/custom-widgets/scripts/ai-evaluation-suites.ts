import { CUSTOM_WIDGET_AI_EVALUATION_CASES } from "./ai-evaluation-cases";
import { CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES } from "./ai-integration-evaluation-cases";
import { CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES } from "./ai-universal-integration-evaluation-cases";

export const customWidgetAiEvaluationSuiteIds = ["core", "integrations", "integration-coverage"] as const;
export type CustomWidgetAiEvaluationSuiteId = (typeof customWidgetAiEvaluationSuiteIds)[number];

export function getCustomWidgetAiEvaluationSuite(id: CustomWidgetAiEvaluationSuiteId) {
  if (id === "integrations") return CUSTOM_WIDGET_AI_INTEGRATION_EVALUATION_CASES;
  if (id === "integration-coverage") return CUSTOM_WIDGET_AI_UNIVERSAL_INTEGRATION_EVALUATION_CASES;
  return CUSTOM_WIDGET_AI_EVALUATION_CASES;
}

export function resolveCustomWidgetAiEvaluationSuiteId(value: string | undefined) {
  if (value === undefined || value === "") return "core" as const;
  const suite = customWidgetAiEvaluationSuiteIds.find((candidate) => candidate === value);
  if (!suite) throw new Error("--suite must be one of: core, integrations, integration-coverage");
  return suite;
}
