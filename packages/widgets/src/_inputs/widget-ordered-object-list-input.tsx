import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

export const WidgetOrderedObjectListInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"orderedObjectList">) => {
  const form = useFormContext();

  const values = form.values.options[property] as Record<string, unknown>[];

  return (
    <div>
      {values.map((value, index) => {
        return <options.itemComponent key={index} item={value} />;
      })}
      {JSON.stringify(options)}
      <span>AAAA!</span>
    </div>
  );
};
