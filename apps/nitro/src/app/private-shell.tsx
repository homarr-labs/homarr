import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { GlobalToolsChrome } from "../features/global-tools/chrome";
import type { GlobalToolsChromeProps } from "../features/global-tools/chrome";
import { IdentityReadBoundary } from "../features/identity/read-boundary";
import type { IdentityReadBoundaryInput } from "../features/identity/read-boundary";
import { SourceNavigationProvider } from "../navigation/source-bridge";

export interface PrivateShellProps extends Omit<GlobalToolsChromeProps, "sessionBlocked"> {
  readonly input: IdentityReadBoundaryInput;
}

export function PrivateShell({ input, ...props }: PrivateShellProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  if (
    queryClient !== props.queryClient ||
    queryClient !== input.scope.queryClient ||
    queryClient !== router.options.context.queryClient
  ) {
    throw new Error("Private shell, Router and authenticated reads must share the root QueryClient");
  }
  if (props.snapshot.session.kind !== "authenticated" || props.chrome.header.userId !== input.principal.user.id) {
    throw new Error("Private shell requires authenticated source chrome for the current principal");
  }
  const generation = JSON.stringify([input.authorityKey, input.scope.identity]);
  return (
    <IdentityReadBoundary input={input}>
      <SourceNavigationProvider key={generation}>
        <GlobalToolsChrome {...props} sessionBlocked={false} />
      </SourceNavigationProvider>
    </IdentityReadBoundary>
  );
}
