import { createWidgetDefinition } from "../definition";
import { definition as rawDefinition } from "./definition";

export const { definition, componentLoader } = createWidgetDefinition("assistant", rawDefinition).withDynamicImport(
  () => import("./component"),
);

export { AssistantWidgetRendererProvider } from "./context";
