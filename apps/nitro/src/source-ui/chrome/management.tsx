import {
  ManageCollectionPage as CollectionPage,
  ManageMobilePrimaryAction as MobilePrimaryAction,
  ManagePageLayoutView,
} from "@homarr/ui/source-views/manage";
import type {
  ManageCollectionPageProps,
  ManageMobilePrimaryActionProps,
  ManagePageLayoutViewProps,
} from "@homarr/ui/source-views/manage";

export {
  DangerZoneItem,
  DangerZoneRootView,
  HeroBannerView,
  ManageCollectionItem,
  ManageCollectionList,
  ManageContainer,
  ManageStickyFooter,
  SectionCard,
  UnsavedChangesBarView,
} from "@homarr/ui/source-views/manage";
export type {
  DangerZoneItemProps,
  DangerZoneRootViewProps,
  HeroBannerViewProps,
  ManageCollectionItemProps,
  ManageCollectionListProps,
  ManageContainerProps,
  ManageStickyFooterProps,
  SectionCardProps,
  UnsavedChangesBarViewProps,
} from "@homarr/ui/source-views/manage";

export type ManagePageLayoutProps = Omit<ManagePageLayoutViewProps, "floatingActionBottomOffset">;
export type SourceManageCollectionPageProps = Omit<ManageCollectionPageProps, "floatingActionBottomOffset">;

export function ManagePageLayout(props: ManagePageLayoutProps) {
  return <ManagePageLayoutView {...props} floatingActionBottomOffset={48} />;
}

export function ManageCollectionPage(props: SourceManageCollectionPageProps) {
  return <CollectionPage {...props} floatingActionBottomOffset={48} />;
}

export function ManageMobilePrimaryAction({ children }: Pick<ManageMobilePrimaryActionProps, "children">) {
  return (
    <MobilePrimaryAction actionButtonMinWidth={160} affixPosition={{ bottom: 20, right: 20 }}>
      {children}
    </MobilePrimaryAction>
  );
}
