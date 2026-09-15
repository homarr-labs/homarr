"use client";

import React from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

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
      <Empty className="mx-auto min-h-[50vh] max-w-xl px-4">
        <EmptyHeader>
          <EmptyMedia className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <IconAlertTriangle size={22} />
          </EmptyMedia>
          <EmptyTitle className="text-xl">Workshop could not be displayed</EmptyTitle>
          <EmptyDescription>Reload the page to try again. Your Homarr installation is not affected.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>Reload Workshop</Button>
        </EmptyContent>
      </Empty>
    );
  }
}
