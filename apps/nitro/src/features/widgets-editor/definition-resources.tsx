import type { AnyNestedClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import { useQueries, useQuery } from "@tanstack/react-query";

import type { createAppProcedures } from "@homarr/api/nitro/routers/app";
import type { createDockerProcedures } from "@homarr/api/nitro/routers/docker";
import type { createWidgetProcedures } from "@homarr/api/nitro/routers/widgets";
import { BookmarkAddButtonView } from "@homarr/widgets/bookmarks/add-button-view";
import type { BookmarkAddButtonViewProps } from "@homarr/widgets/bookmarks/add-button-view";
import type { DefinitionResourceBindings, DefinitionResourcesFor } from "@homarr/widgets/definition-manifest";

import type { ExpansionQueryCacheIdentity, QueryScopeOwner } from "../../query/types";

export type NativeDefinitionWidgetClient = RouterClient<{ widget: ReturnType<typeof createWidgetProcedures> }>;
export type NativeDefinitionAppClient = RouterClient<{ app: ReturnType<typeof createAppProcedures> }>;
export type NativeDefinitionDockerClient = RouterClient<{ docker: ReturnType<typeof createDockerProcedures> }>;

export type NativeDefinitionOwnerBinding<TOwner> =
  | { status: "ready"; owner: TOwner }
  | { status: "held"; reason: string };

export interface NativeDefinitionQueryOwner<TClient extends AnyNestedClient> {
  client: TClient;
  queryScopeOwner: QueryScopeOwner<TClient>;
  identity: ExpansionQueryCacheIdentity;
  assertCurrent(): void;
}

export interface NativeBookmarkDefinitionPresentationOwner {
  ItemComponent: DefinitionResourcesFor<"bookmarks">["ItemComponent"];
  useAddButtonPresentation(
    props: Parameters<DefinitionResourcesFor<"bookmarks">["AddButton"]>[0],
  ): Pick<BookmarkAddButtonViewProps, "labels" | "groupsEditor">;
  assertCurrent(): void;
}

export interface NativeWidgetDefinitionResourceInputs {
  widget: NativeDefinitionOwnerBinding<NativeDefinitionQueryOwner<NativeDefinitionWidgetClient>>;
  app: NativeDefinitionOwnerBinding<NativeDefinitionQueryOwner<NativeDefinitionAppClient>>;
  docker: NativeDefinitionOwnerBinding<NativeDefinitionQueryOwner<NativeDefinitionDockerClient>>;
  bookmarkPresentation: NativeDefinitionOwnerBinding<NativeBookmarkDefinitionPresentationOwner>;
  useTimetableTranslations: DefinitionResourcesFor<"timetable">["useTimetableTranslations"];
  assertCurrent(): void;
}

export function createNativeWidgetDefinitionResources(
  inputs: NativeWidgetDefinitionResourceInputs,
): DefinitionResourceBindings {
  const assertResourceCurrent = inputs.assertCurrent;
  const useTimetableTranslations = inputs.useTimetableTranslations;
  assertResourceCurrent();

  function captureQueryOwner<TClient extends AnyNestedClient>(
    binding: NativeDefinitionOwnerBinding<NativeDefinitionQueryOwner<TClient>>,
  ) {
    if (binding.status === "held") return { status: "held", reason: binding.reason } as const;
    const owner = binding.owner;
    const assertOwnerCurrent = owner.assertCurrent.bind(owner);
    assertOwnerCurrent();
    const queryScope = owner.queryScopeOwner.acquire(owner.client, owner.identity);
    const assertCurrent = () => {
      assertResourceCurrent();
      assertOwnerCurrent();
      queryScope.assertCurrent();
    };
    assertCurrent();
    return { status: "ready", queryScope, assertCurrent } as const;
  }

  const widget = captureQueryOwner(inputs.widget);
  const app = captureQueryOwner(inputs.app);
  const docker = captureQueryOwner(inputs.docker);
  const presentation = inputs.bookmarkPresentation;
  const resources: DefinitionResourceBindings = {
    timetable: { status: "held", reason: "Native Widget definition resources are not bound" },
    "immich-albumCarousel": { status: "held", reason: "Native Widget definition resources are not bound" },
    beszelSystemStats: { status: "held", reason: "Native Widget definition resources are not bound" },
    healthMonitoring: { status: "held", reason: "Native Widget definition resources are not bound" },
    systemDisks: { status: "held", reason: "Native Widget definition resources are not bound" },
    dockerContainers: { status: "held", reason: "Native Docker definition resources are not bound" },
    bookmarks: { status: "held", reason: "Native App and Bookmark presentation owners are not bound" },
  };

  if (widget.status === "held") {
    resources.timetable = { ...widget };
    resources["immich-albumCarousel"] = { ...widget };
    resources.beszelSystemStats = { ...widget };
    resources.healthMonitoring = { ...widget };
    resources.systemDisks = { ...widget };
  } else {
    resources.timetable = {
      status: "ready",
      resources: {
        useStationSearch(input) {
          widget.assertCurrent();
          const query = useQuery(
            widget.queryScope.orpc.widget.timetable.searchStations.queryOptions({ input }),
            widget.queryScope.queryClient,
          );
          widget.assertCurrent();
          return query;
        },
        useTimetableTranslations() {
          widget.assertCurrent();
          const translations = useTimetableTranslations();
          widget.assertCurrent();
          return translations;
        },
      },
    };
    resources["immich-albumCarousel"] = {
      status: "ready",
      resources: {
        useAlbums(input, options) {
          widget.assertCurrent();
          const query = useQuery(
            widget.queryScope.orpc.widget.immich.getAlbums.queryOptions({ input, ...options }),
            widget.queryScope.queryClient,
          );
          widget.assertCurrent();
          return query;
        },
      },
    };
    resources.beszelSystemStats = {
      status: "ready",
      resources: {
        useSystems(input, options) {
          widget.assertCurrent();
          const query = useQuery(
            widget.queryScope.orpc.widget.beszel.getSystems.queryOptions({ input, ...options }),
            widget.queryScope.queryClient,
          );
          widget.assertCurrent();
          return query;
        },
      },
    };
    const storageResources: DefinitionResourcesFor<"healthMonitoring"> = {
      useStorageVolumeObservations(integrationIds) {
        widget.assertCurrent();
        const observations = useQueries(
          {
            queries: integrationIds.map((integrationId) =>
              widget.queryScope.orpc.widget.healthMonitoring.listStorageVolumes.queryOptions({
                input: { integrationId },
              }),
            ),
          },
          widget.queryScope.queryClient,
        );
        widget.assertCurrent();
        return observations;
      },
    };
    resources.healthMonitoring = { status: "ready", resources: storageResources };
    resources.systemDisks = { status: "ready", resources: storageResources };
  }

  if (docker.status === "held") {
    resources.dockerContainers = { ...docker };
  } else {
    resources.dockerContainers = {
      status: "ready",
      resources: {
        useEndpoints() {
          docker.assertCurrent();
          const query = useQuery(
            docker.queryScope.orpc.docker.getEndpoints.queryOptions({ input: undefined }),
            docker.queryScope.queryClient,
          );
          docker.assertCurrent();
          return query;
        },
      },
    };
  }

  if (app.status === "held") {
    resources.bookmarks = { ...app };
  } else if (presentation.status === "held") {
    resources.bookmarks = { status: "held", reason: presentation.reason };
  } else {
    const presentationOwner = presentation.owner;
    const ItemComponent = presentationOwner.ItemComponent;
    const assertPresentationCurrent = presentationOwner.assertCurrent.bind(presentationOwner);
    const useAddButtonPresentation = presentationOwner.useAddButtonPresentation.bind(presentationOwner);
    const assertBookmarkCurrent = () => {
      app.assertCurrent();
      assertPresentationCurrent();
    };
    assertBookmarkCurrent();
    resources.bookmarks = {
      status: "ready",
      resources: {
        useAppByIds(appIds) {
          assertBookmarkCurrent();
          const query = useQuery(
            app.queryScope.orpc.app.byIds.queryOptions({ input: appIds }),
            app.queryScope.queryClient,
          );
          assertBookmarkCurrent();
          return query;
        },
        AddButton(props) {
          assertBookmarkCurrent();
          const ownedProps: typeof props = {
            ...props,
            addItem(item) {
              assertBookmarkCurrent();
              props.addItem(item);
              assertBookmarkCurrent();
            },
            migrateItems(items, optionsPatch) {
              assertBookmarkCurrent();
              props.migrateItems(items, optionsPatch);
              assertBookmarkCurrent();
            },
            removeItem(value) {
              assertBookmarkCurrent();
              props.removeItem(value);
              assertBookmarkCurrent();
            },
          };
          const selectableApps = useQuery(
            app.queryScope.orpc.app.selectable.queryOptions({ input: undefined }),
            app.queryScope.queryClient,
          );
          const presentationProps = useAddButtonPresentation(ownedProps);
          assertBookmarkCurrent();
          return <BookmarkAddButtonView {...ownedProps} {...presentationProps} selectableApps={selectableApps} />;
        },
        ItemComponent(props) {
          assertBookmarkCurrent();
          return (
            <ItemComponent
              {...props}
              removeItem={() => {
                assertBookmarkCurrent();
                props.removeItem();
                assertBookmarkCurrent();
              }}
            />
          );
        },
      },
    };
  }

  assertResourceCurrent();
  return resources;
}
