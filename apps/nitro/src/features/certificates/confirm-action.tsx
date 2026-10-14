import { InlineConfirmButton } from "../../source-ui/certificates";

export interface ConfirmCertificateActionProps {
  readonly label: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly disabled: boolean;
  readonly fullWidth?: boolean;
  readonly onConfirm: () => Promise<boolean>;
}

export function ConfirmCertificateAction(props: ConfirmCertificateActionProps) {
  return (
    <InlineConfirmButton
      type="button"
      variant="default"
      fullWidth={props.fullWidth}
      disabled={props.disabled}
      loading={props.pending}
      confirmLabel={props.confirmLabel}
      onConfirm={async () => {
        await props.onConfirm();
      }}
    >
      {props.label}
    </InlineConfirmButton>
  );
}
