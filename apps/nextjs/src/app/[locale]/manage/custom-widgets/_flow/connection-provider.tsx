"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Connection } from "@xyflow/react";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import type { CustomWidgetWorkbenchForm } from "../_custom-widget-form-utils";
import { createFlowCommands, isGraphEditable } from "./commands";
import { isGeneratedConnectionCurrent, planFlowConnection } from "./connection-planner";
import type { FlowBindingIntent } from "./connection-planner";
import type { WidgetNode, WidgetEdge } from "./graph";
import { FlowBindingDialog } from "./binding-dialog";

type Connect = (connection: Connection, nodes: WidgetNode[], replacing?: WidgetEdge) => string | null;
const FlowConnectionContext = createContext<Connect | null>(null);

export function FlowConnectionProvider({ form, children }: { form: CustomWidgetWorkbenchForm; children: ReactNode }) {
  const store = useCustomWidgetFormDocumentStore();
  const [pending, setPending] = useState<FlowBindingIntent | null>(null);
  const connect = useCallback<Connect>(
    (connection, nodes, replacing) => {
      if (!isGraphEditable(store.getValues())) return "invalidGraphJson";
      if (replacing && !replacing.data?.generatedBindingIds?.length)
        return createFlowCommands(form, store).reconnect(replacing, connection, nodes);
      const plan = planFlowConnection(connection, nodes, store.getValues());
      if (plan === "direct") {
        if (replacing) return "codeOwned";
        let issue: string | null = null;
        store.transaction(() => {
          issue = createFlowCommands(form, store).connect(connection, nodes);
        });
        return issue;
      }
      if (typeof plan === "string") return plan;
      if (replacing) {
        if (!replacing.data?.generatedBindingIds?.length) return "codeOwned";
        if (!isGeneratedConnectionCurrent(store.getValues(), replacing.id, replacing.data.generatedBindingIds))
          return "codeOwned";
        plan.replaceGeneratedIds = replacing.data.generatedBindingIds;
        plan.replaceEdgeId = replacing.id;
      }
      setPending(plan);
      return null;
    },
    [form, store],
  );
  return (
    <FlowConnectionContext.Provider value={connect}>
      {children}
      {pending && <FlowBindingDialog intent={pending} form={form} onClose={() => setPending(null)} />}
    </FlowConnectionContext.Provider>
  );
}

export function useFlowConnection() {
  const connect = useContext(FlowConnectionContext);
  if (!connect) throw new Error("Flow connections require FlowConnectionProvider");
  return connect;
}
