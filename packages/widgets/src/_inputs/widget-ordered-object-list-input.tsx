import type {CommonWidgetInputProps} from "./common";

export const WidgetOrderedObjectListInput = ({ property, kind, options }: CommonWidgetInputProps<"orderedObjectList">) => {
  return <div>
    {JSON.stringify(options)}
    <span>AAAA!</span>
  </div>
}