import type { BoardPermission } from "@homarr/definitions";
import { createFormContext } from "@homarr/form";

export interface BoardAccessFormType {
  items: {
    itemId: string;
    permission: BoardPermission;
  }[];
}

export const [FormProvider, useFormContext, useForm] =
  createFormContext<BoardAccessFormType>();

export type OnCountChange = (callback: (prev: number) => number) => void;
