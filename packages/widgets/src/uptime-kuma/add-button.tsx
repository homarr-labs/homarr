"use client";

import { Button } from "@mantine/core";
import { useFormContext } from "../_inputs/form";

import type { SortableItemListInput } from "../options";
import type { UptimeKumaCheck } from "@homarr/integrations/types";
import { clientApi } from "@homarr/api/client";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { UptimeKumaCheckSelectModal } from "./check-select-modal";

export const UptimeKumaAddButton: SortableItemListInput<UptimeKumaCheck, number>["AddButton"] = ({
  addItem,
  values,
}) => {
  const form = useFormContext<{integrationIds: string[]}>();
  const integrationIds = form.values.integrationIds;
  const { openModal } = useModalAction(UptimeKumaCheckSelectModal);
  const t = useI18n();

  return (
    <Button
      onClick={() =>
        openModal({
          onSelect: addItem,
          presentIds: values,
          integrationIds,
        })
      }
    >
      {t("widget.uptimeKuma.option.checkIds.add")}
    </Button>
  );
};
