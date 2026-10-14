import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { getSafeAppHref } from "@homarr/common/url";
import type { NavigationAdapter, NavigationLinkProps } from "@homarr/ui/navigation";
import { NavigationProvider } from "@homarr/ui/navigation";

import { parseSourceSearch, stringifySourceSearch } from "./source-search";
import { sourceRoutePaths } from "./source-routes";

const sourcePatterns = Object.values(sourceRoutePaths).toSorted((left, right) => {
  const leftSegments = left.split("/");
  const rightSegments = right.split("/");
  for (let index = 0; index < Math.min(leftSegments.length, rightSegments.length); index++) {
    const leftDynamic = leftSegments[index]?.startsWith("$") ?? false;
    const rightDynamic = rightSegments[index]?.startsWith("$") ?? false;
    if (leftDynamic !== rightDynamic) return Number(leftDynamic) - Number(rightDynamic);
  }
  return 0;
});

export interface SourceNavigationOptions {
  scroll?: boolean;
}

export type SourceDestination =
  | {
      kind: "internal";
      href: string;
      pathname: string;
      to: string;
      params: Record<string, string>;
      search: Record<string, unknown>;
      hash: string;
    }
  | { kind: "external"; href: string }
  | { kind: "blocked" };

function requireSourceSearch(router: ReturnType<typeof useRouter>) {
  if (router.options.parseSearch !== parseSourceSearch || router.options.stringifySearch !== stringifySourceSearch) {
    throw new Error("Source navigation requires sourceSearchSerialization on the Router");
  }
}

function sourceOrigin(router: ReturnType<typeof useRouter>) {
  if (!router.origin) throw new Error("Source navigation requires the Router origin");
  return router.origin;
}

function sourcePathOptions(pathname: string) {
  const segments = pathname.replace(/\/$/, "").split("/");
  for (const to of sourcePatterns) {
    if (to.endsWith("/$")) continue;
    const pattern = to.replace(/\/$/, "").split("/");
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matches = pattern.every((segment, index) => {
      const value = segments[index];
      if (value === undefined) return false;
      if (!segment.startsWith("$")) return segment === value;
      if (!value) return false;
      params[segment.slice(1)] = decodeURIComponent(value);
      return true;
    });
    if (matches) return { to, params };
  }
  const catchall = sourceRoutePaths["/manage/[...not-found]"];
  const prefix = catchall.slice(0, -1);
  if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
    return { to: catchall, params: { _splat: decodeURIComponent(pathname.slice(prefix.length)) } };
  }
  return { to: pathname.replaceAll("$", "%24"), params: {} };
}

export function resolveSourceDestination(href: string, currentHref: string, origin: string): SourceDestination {
  const base = new URL(currentHref, origin);
  try {
    let safeHref = getSafeAppHref(href);
    if (href === "" || href.startsWith("//")) {
      safeHref = getSafeAppHref(new URL(href, base).href);
    }
    const relativePath = href.split(/[?#]/, 1)[0] ?? "";
    if (!safeHref && href.trim() && !/^[\s/\\]|[:\\]/.test(relativePath)) {
      safeHref = getSafeAppHref(`./${href}`);
    }
    if (!safeHref) return { kind: "blocked" };
    const url = new URL(safeHref, base);
    if (url.origin !== origin || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return { kind: "external", href: safeHref };
    }
    decodeURIComponent(url.pathname);
    return {
      kind: "internal",
      href: `${url.pathname}${url.search}${url.hash}`,
      pathname: url.pathname,
      ...sourcePathOptions(url.pathname),
      search: parseSourceSearch(url.search),
      hash: url.hash.slice(1),
    };
  } catch (error) {
    if (error instanceof TypeError || error instanceof URIError) return { kind: "blocked" };
    throw error;
  }
}

export function SourceLink({ href, replace, scroll, prefetch, children, ...props }: NavigationLinkProps) {
  const router = useRouter();
  const currentHref = useRouterState({ select: (state) => state.location.publicHref });
  requireSourceSearch(router);
  const destination = resolveSourceDestination(href, currentHref, sourceOrigin(router));
  if (destination.kind === "blocked") return <a {...props}>{children}</a>;
  if (destination.kind === "external" || (props.download !== undefined && props.download !== false)) {
    return (
      <a {...props} href={destination.href}>
        {children}
      </a>
    );
  }

  let preload: false | "intent" | "viewport" = "intent";
  if (prefetch === false) preload = false;
  if (prefetch === true) preload = "viewport";

  return (
    <Link
      {...props}
      to={destination.to}
      params={destination.params}
      search={destination.search}
      hash={destination.hash}
      replace={replace}
      resetScroll={scroll}
      hashScrollIntoView={scroll}
      preload={preload}
      activeProps={{}}
    >
      {children}
    </Link>
  );
}

export function useSourceLocation() {
  const router = useRouter();
  return useRouterState({
    select: (state) => {
      const url = new URL(state.location.publicHref, sourceOrigin(router));
      return { pathname: url.pathname, search: url.search, hash: url.hash };
    },
  });
}

export function useSourceRouter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  requireSourceSearch(router);

  return useMemo(() => {
    const destinationFor = (href: string) => {
      const destination = resolveSourceDestination(href, router.latestLocation.publicHref, sourceOrigin(router));
      if (destination.kind === "blocked") throw new TypeError("Unsafe navigation destination");
      return destination;
    };
    const navigate = (href: string, replace: boolean, options: SourceNavigationOptions = {}) => {
      const destination = destinationFor(href);
      if (destination.kind === "external") {
        const protocol = new URL(destination.href, sourceOrigin(router)).protocol;
        if (!router.protocolAllowlist.has(protocol)) {
          throw new TypeError("External destination protocol is not admitted by the Router");
        }
        return router.navigate({ href: destination.href, reloadDocument: true, replace });
      }
      return router.navigate({
        to: destination.to,
        params: destination.params,
        search: destination.search,
        hash: destination.hash,
        replace,
        resetScroll: options.scroll,
        hashScrollIntoView: options.scroll,
      });
    };

    return {
      push: (href: string, options?: SourceNavigationOptions) => navigate(href, false, options),
      replace: (href: string, options?: SourceNavigationOptions) => navigate(href, true, options),
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      prefetch: (href: string) => {
        const destination = destinationFor(href);
        if (destination.kind === "external") throw new TypeError("External destinations cannot be route-prefetched");
        return router.preloadRoute({
          to: destination.to,
          params: destination.params,
          search: destination.search,
          hash: destination.hash,
        });
      },
      refresh: async () => {
        const errors: unknown[] = [];
        try {
          if (router.options.context.queryClient !== queryClient) {
            throw new Error("Source navigation refresh must use the Router context QueryClient");
          }
          await queryClient.invalidateQueries({ refetchType: "active" }, { throwOnError: true, cancelRefetch: false });
        } catch (error) {
          errors.push(error);
        }
        try {
          await router.invalidate({ sync: true });
        } catch (error) {
          errors.push(error);
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1) throw new AggregateError(errors, "Source navigation refresh failed");
      },
    };
  }, [router, queryClient]);
}

export type SourceNavigationRouter = ReturnType<typeof useSourceRouter>;

export function useSourcePathname() {
  return useSourceLocation().pathname;
}

export function useSourceSearchParams() {
  const { search } = useSourceLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function SourceNavigationProvider({ children }: PropsWithChildren) {
  const navigation = useSourceRouter();
  const { pathname, search } = useSourceLocation();
  const adapter = useMemo<NavigationAdapter>(
    () => ({ pathname, search, replace: navigation.replace, Link: SourceLink }),
    [pathname, search, navigation],
  );

  return <NavigationProvider adapter={adapter}>{children}</NavigationProvider>;
}
