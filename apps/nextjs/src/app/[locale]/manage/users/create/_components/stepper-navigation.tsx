import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { StepperNavigationView } from "@homarr/ui/source-views/identity-settings";

interface StepperNavigationComponentProps {
  hasPrevious: boolean;
  hasNext: boolean;
  isComplete: boolean;
  isLoadingNextStep: boolean;
  prevStep: () => void;
  nextStep: () => void;
  reset: () => void;
}

export const StepperNavigationComponent = ({
  hasNext,
  hasPrevious,
  isComplete,
  isLoadingNextStep,
  nextStep,
  prevStep,
  reset,
}: StepperNavigationComponentProps) => {
  const tCommon = useI18n("common");
  const tCreate = useI18n("management.page.user.create");
  return (
    <StepperNavigationView
      hasNext={hasNext}
      hasPrevious={hasPrevious}
      isComplete={isComplete}
      isLoadingNextStep={isLoadingNextStep}
      nextStep={nextStep}
      prevStep={prevStep}
      reset={reset}
      previousLabel={tCommon("action.previous")}
      nextLabel={tCommon("action.next")}
      createAnotherLabel={tCreate("action.createAnother")}
      backLabel={tCreate("action.back")}
      backHref="/manage/users"
      linkComponent={Link}
    />
  );
};
