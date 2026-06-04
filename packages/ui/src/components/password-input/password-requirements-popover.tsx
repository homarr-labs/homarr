import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Popover, Progress, Text } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";
import { passwordRequirements } from "@homarr/validation/user";

import { PasswordRequirement } from "./password-requirement";

const strengthColorMap = [
  { min: 100, color: "teal" },
  { min: 51, color: "yellow" },
  { min: 0, color: "dimmed" },
] as const;

export const PasswordRequirementsPopover = ({ password, children }: PropsWithChildren<{ password: string }>) => {
  const tPassword = useScopedI18n("user.field.password");
  const requirements = useRequirements();
  const strength = useStrength(password);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const strengthColor = strengthColorMap.find(({ min }) => strength >= min)?.color ?? "dimmed";
  const checks = (
    <>
      {requirements.map((requirement) => (
        <PasswordRequirement key={requirement.label} label={requirement.label} meets={requirement.check(password)} />
      ))}
    </>
  );

  return (
    <Popover opened={popoverOpened} position="bottom" width="target" transitionProps={{ transition: "pop" }}>
      <Popover.Target>
        <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
          {children}
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <Progress color={strengthColor} value={strength} size={5} mb="xs" />
        <Text size="sm" c="dimmed" mb="xs">
          {tPassword("suggestionsTitle")}
        </Text>
        {checks}
      </Popover.Dropdown>
    </Popover>
  );
};

const useRequirements = () => {
  const t = useScopedI18n("user.field.password.suggestion");

  return passwordRequirements.map(({ check, value }) => ({ check, label: t(value) }));
};

function useStrength(password: string) {
  const requirements = useRequirements();

  return (100 / requirements.length) * requirements.filter(({ check }) => check(password)).length;
}
