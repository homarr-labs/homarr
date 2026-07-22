import React from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

interface State {
  failed: boolean;
}

export class WorkshopErrorBoundary extends React.Component<React.PropsWithChildren<object>, State> {
  public state: State = { failed: false };

  public static getDerivedStateFromError(): State {
    return { failed: true };
  }

  public render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <IconAlertTriangle size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Workshop could not be displayed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reload the page to try again. Your Homarr installation is not affected.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>Reload Workshop</Button>
      </div>
    );
  }
}
