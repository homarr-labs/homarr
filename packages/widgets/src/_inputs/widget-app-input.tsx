"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SelectProps } from "@mantine/core";
import { Anchor, Button, Group, Loader, Select, SimpleGrid, Text } from "@mantine/core";
import { IconCheck, IconPlus } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { IconPickerResources } from "@homarr/forms-collection";
import { createModal, useModalAction } from "@homarr/modals";
import { QuickAddAppContent, QuickAddAppModal } from "@homarr/modals-collection/apps/quick-add-app/quick-add-app-modal";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import { useStaticWidgetInputOwner } from "./static-owner";

type SessionObservation = ReturnType<typeof useSession>;

export const captureLegacyWidgetSession = (session: SessionObservation["data"]) => {
  if (!session) return null;
  return {
    session,
    fields: JSON.stringify([
      session.expires,
      session.user.id,
      session.user.name,
      session.user.email,
      session.user.image,
      session.user.colorScheme,
      [...session.user.permissions],
    ]),
  };
};

export const isLegacyWidgetSessionCurrent = (
  captured: ReturnType<typeof captureLegacyWidgetSession>,
  observed: SessionObservation,
) => {
  const current = captureLegacyWidgetSession(observed.data);
  return (
    observed.status === "authenticated" &&
    captured !== null &&
    current !== null &&
    captured.session === current.session &&
    captured.fields === current.fields
  );
};

function useLegacyWidgetIcons(
  input: Parameters<IconPickerResources["useIcons"]>[0],
  options: Parameters<IconPickerResources["useIcons"]>[1],
) {
  return clientApi.icon.findIcons.useQuery(input, { ...options, retry: false });
}

export function useLegacyWidgetIconResources(isCurrentOwner: () => boolean, value: unknown): IconPickerResources {
  const session = useSession();
  const mutation = clientApi.media.uploadMedia.useMutation({ retry: false });
  const utils = clientApi.useUtils();
  const mount = useRef<{ active: boolean } | null>(null);
  const current = useRef({ session, value, isCurrentOwner, mutation, utils });
  const uploadOwner = useRef<{
    active: boolean;
    mount: { active: boolean };
    session: ReturnType<typeof captureLegacyWidgetSession>;
    fieldOwner: () => boolean;
    value: unknown;
    ids: string[] | null;
    deliveryReady: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  useLayoutEffect(() => {
    const lease = { active: true };
    mount.current = lease;
    setMounted(true);
    return () => {
      lease.active = false;
      if (uploadOwner.current) uploadOwner.current.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    current.current = { session, value, isCurrentOwner, mutation, utils };
    const owner = uploadOwner.current;
    if (!owner) return;
    const deliveredValue = owner.ids?.[0];
    const ownDelivery =
      owner.deliveryReady && deliveredValue !== undefined && value === `/api/user-medias/${deliveredValue}`;
    if (
      !isLegacyWidgetSessionCurrent(owner.session, session) ||
      !owner.fieldOwner() ||
      !isCurrentOwner() ||
      (value !== owner.value && !ownDelivery)
    )
      owner.active = false;
  });
  const isCurrentUploadOwner = useCallback(() => {
    const host = current.current;
    const owner = uploadOwner.current;
    const lease = mount.current;
    if (
      !lease?.active ||
      !host.isCurrentOwner() ||
      host.session.status !== "authenticated" ||
      !host.session.data?.user.permissions.includes("media-upload")
    ) {
      if (owner) owner.active = false;
      return false;
    }
    if (!owner) return host.value === value;
    const ownDelivery =
      owner.value === value &&
      owner.deliveryReady &&
      owner.ids?.[0] !== undefined &&
      host.value === `/api/user-medias/${owner.ids[0]}`;
    if (owner.value !== value) return host.value === value;
    const valid =
      owner.active &&
      owner.mount === lease &&
      owner.fieldOwner() &&
      isLegacyWidgetSessionCurrent(owner.session, host.session) &&
      (host.value === value || ownDelivery);
    if (!valid) owner.active = false;
    return valid;
  }, [value]);
  const upload = useCallback(
    async (formData: FormData) => {
      const host = current.current;
      const lease = mount.current;
      if (
        !lease?.active ||
        host.value !== value ||
        !host.isCurrentOwner() ||
        host.session.status !== "authenticated" ||
        !host.session.data?.user.permissions.includes("media-upload")
      )
        throw new Error("Media upload owner unavailable");
      const owner: NonNullable<typeof uploadOwner.current> = {
        active: true,
        mount: lease,
        session: captureLegacyWidgetSession(host.session.data),
        fieldOwner: host.isCurrentOwner,
        value: host.value,
        ids: null,
        deliveryReady: false,
      };
      uploadOwner.current = owner;
      setIsUploading(true);
      const ids = await host.mutation.mutateAsync(formData);
      owner.ids = ids;
      return ids;
    },
    [value],
  );
  const onSettled = useCallback(async () => {
    const owner = uploadOwner.current;
    const requireOwner = () => {
      if (!owner || uploadOwner.current !== owner || !isCurrentUploadOwner())
        throw new Error("Media upload owner retired");
    };
    try {
      requireOwner();
      await current.current.utils.media.getPaginated.invalidate(undefined, undefined, { throwOnError: true });
      requireOwner();
      await current.current.utils.icon.findIcons.invalidate(undefined, undefined, { throwOnError: true });
      requireOwner();
      if (owner) owner.deliveryReady = true;
    } finally {
      if (mount.current?.active && uploadOwner.current === owner) setIsUploading(false);
    }
  }, [isCurrentUploadOwner]);
  const canUpload =
    mounted &&
    session.status === "authenticated" &&
    session.data.user.permissions.includes("media-upload") &&
    isCurrentOwner();
  const resources: IconPickerResources = { useIcons: useLegacyWidgetIcons, canUpload };
  if (canUpload)
    resources.upload = {
      upload,
      isPending: mutation.isPending || isUploading,
      onSettled,
      isCurrentOwner: isCurrentUploadOwner,
      outcomeLabels: {
        unknown: "The upload outcome could not be confirmed. Refresh and check before uploading again.",
        reconcileheld: "The image was uploaded, but refresh failed. Retry refresh, not the upload.",
      },
    };
  return resources;
}

interface LegacyQuickAddProps {
  session: ReturnType<typeof captureLegacyWidgetSession>;
  source: { isCurrent: () => boolean; refresh: (id: string) => Promise<void>; select: (id: string) => void };
}

function LegacyQuickAddContent({
  innerProps,
  actions,
}: {
  innerProps: LegacyQuickAddProps;
  actions: { closeModal: () => void; capturePresentationOwner: () => { isCurrent: () => boolean } };
}) {
  const session = useSession();
  const mutation = clientApi.app.create.useMutation({ retry: false });
  const utils = clientApi.useUtils();
  const owner = useRef<{ active: boolean; presentation: { isCurrent: () => boolean } } | null>(null);
  const host = useRef({ session, innerProps, mutation, utils });
  const dirty = useRef(false);
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const lease = { active: true, presentation: actions.capturePresentationOwner() };
    owner.current = lease;
    setReady(true);
    return () => {
      lease.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { session, innerProps, mutation, utils };
    if (owner.current && (!isLegacyWidgetSessionCurrent(innerProps.session, session) || !innerProps.source.isCurrent()))
      owner.current.active = false;
  });
  const isCurrentOwner = useCallback(() => {
    const lease = owner.current;
    const current = host.current;
    const valid =
      lease !== null &&
      lease.active &&
      lease.presentation.isCurrent() &&
      isLegacyWidgetSessionCurrent(current.innerProps.session, current.session) &&
      current.session.data?.user.permissions.includes("app-create") === true &&
      current.innerProps.source.isCurrent();
    if (!valid && lease) lease.active = false;
    return valid;
  }, []);
  const captureSubmissionOwner = useCallback(() => {
    const lease = owner.current;
    return { isCurrent: () => lease !== null && owner.current === lease && lease.active && isCurrentOwner() };
  }, [isCurrentOwner]);
  const onDirtyChange = useCallback(
    (value: boolean) => {
      if (isCurrentOwner()) dirty.current = value;
    },
    [isCurrentOwner],
  );
  const iconPickerProps = useLegacyWidgetIconResources(isCurrentOwner, undefined);
  const closeOwner = owner.current;
  return (
    <QuickAddAppContent
      actions={{
        closeModal() {
          if (!closeOwner || owner.current !== closeOwner || !closeOwner.presentation.isCurrent()) return;
          closeOwner.active = false;
          actions.closeModal();
        },
      }}
      innerProps={{
        createApp:
          ready && isCurrentOwner()
            ? async (values) => {
                if (!isCurrentOwner() || !dirty.current) throw new Error("App creation owner unavailable");
                return host.current.mutation.mutateAsync(values);
              }
            : undefined,
        onCreated: async (app) => {
          if (!isCurrentOwner()) throw new Error("App creation owner retired");
          await host.current.utils.app.invalidate(
            undefined,
            { refetchType: host.current.session.data?.user.permissions.includes("app-modify-all") ? "active" : "none" },
            { throwOnError: true },
          );
          if (!isCurrentOwner()) throw new Error("App creation owner retired");
          await host.current.innerProps.source.refresh(app.id);
          if (!isCurrentOwner()) throw new Error("App creation owner retired");
        },
        onClose: ({ id }) => {
          if (isCurrentOwner()) host.current.innerProps.source.select(id);
        },
        isPending: mutation.isPending || iconPickerProps.upload?.isPending === true,
        iconPickerProps,
        isCurrentOwner,
        onDirtyChange,
        captureSubmissionOwner,
        outcomeLabels: {
          unknown: "The app creation outcome could not be confirmed. Refresh and check before submitting again.",
          reconcileheld: "The app was created, but refresh failed. Retry refresh, not app creation.",
        },
      }}
    />
  );
}

const LegacyQuickAddModal = createModal<LegacyQuickAddProps>(LegacyQuickAddContent).withOptions(
  QuickAddAppModal.options,
);

const renderHereLink = (children: React.ReactNode) => (
  <Anchor size="xs" component={Link} target="_blank" href="/manage/apps/new">
    {children}
  </Anchor>
);

export const WidgetAppInput = ({ property, kind, boardId, itemId }: CommonWidgetInputProps<"app">) => {
  const tCommon = useI18n("common");
  const tApp = useI18n("widget.common.app");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { data: apps, isPending, refetch } = clientApi.app.selectable.useQuery();
  const session = useSession();
  const canCreateApps = session.data?.user.permissions.includes("app-create") ?? false;
  const staticOwner = useStaticWidgetInputOwner(kind, property);
  const binding = useMemo(() => ({ kind, property, boardId, itemId }), [kind, property, boardId, itemId]);
  const mount = useRef<{ active: boolean } | null>(null);
  const host = useRef({ binding, form, session, refetch, staticOwner });
  const selected = useRef<{
    active: boolean;
    binding: typeof binding;
    value: unknown;
    session: ReturnType<typeof captureLegacyWidgetSession>;
  } | null>(null);
  useLayoutEffect(() => {
    const lease = { active: true };
    mount.current = lease;
    return () => {
      lease.active = false;
      if (selected.current) selected.current.active = false;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { binding, form, session, refetch, staticOwner };
    const origin = selected.current;
    if (
      origin &&
      (origin.binding !== binding ||
        form.values.options[property] !== origin.value ||
        !isLegacyWidgetSessionCurrent(origin.session, session))
    )
      origin.active = false;
  });

  const { openModal } = useModalAction(LegacyQuickAddModal);

  const currentApp = useMemo(
    () => apps?.find((app) => app.id === form.values.options.appId),
    [apps, form.values.options.appId],
  );

  return (
    <SimpleGrid cols={{ base: 1, md: canCreateApps ? 2 : 1 }} spacing={{ base: "md" }} style={{ alignItems: "center" }}>
      <Select
        label={tInput("label")}
        searchable
        leftSection={<MemoizedLeftSection isPending={isPending} currentApp={currentApp} />}
        nothingFoundMessage={tApp("noData")}
        renderOption={renderSelectOption}
        data={
          apps?.map((app) => ({
            label: app.name,
            value: app.id,
            iconUrl: app.iconUrl,
          })) ?? []
        }
        inputWrapperOrder={["label", "input", "description", "error"]}
        description={
          <Text component="span" size="xs">
            {tApp.rich("description", {
              here: () => renderHereLink(tCommon("here")),
            })}
          </Text>
        }
        styles={{ root: { flex: "1" } }}
        {...form.getInputProps(`options.${property}`)}
      />
      {canCreateApps && (
        <Button
          mt={3}
          leftSection={<IconPlus size={18} />}
          variant="default"
          onClick={() => {
            const current = host.current;
            const lease = mount.current;
            if (
              !lease?.active ||
              current.binding !== binding ||
              !current.staticOwner.isCurrent() ||
              current.session.status !== "authenticated" ||
              !current.session.data.user.permissions.includes("app-create")
            )
              return;
            const origin = {
              active: true,
              binding,
              value: current.form.values.options[property],
              session: captureLegacyWidgetSession(current.session.data),
            };
            if (selected.current) selected.current.active = false;
            selected.current = origin;
            const isCurrent = () => {
              const valid =
                origin.active &&
                selected.current === origin &&
                lease.active &&
                mount.current === lease &&
                host.current.binding === origin.binding &&
                isLegacyWidgetSessionCurrent(origin.session, host.current.session);
              if (!valid) origin.active = false;
              return valid;
            };
            openModal({
              session: origin.session,
              source: {
                isCurrent,
                async refresh(id) {
                  if (!isCurrent()) throw new Error("App selection source retired");
                  const result = await host.current.refetch({ throwOnError: true });
                  if (!isCurrent() || !result.isSuccess || !result.data.some((app) => app.id === id))
                    throw new Error("App selection refresh unavailable");
                },
                select(id) {
                  if (isCurrent()) host.current.form.setFieldValue(`options.${property}`, id);
                },
              },
            });
          }}
        >
          {tApp("create")}
        </Button>
      )}
    </SimpleGrid>
  );
};

const iconProps = {
  stroke: 1.5,
  color: "currentColor",
  opacity: 0.6,
  size: 18,
};

const renderSelectOption: SelectProps["renderOption"] = ({ option, checked }) => (
  <Group flex="1" gap="xs">
    {"iconUrl" in option && typeof option.iconUrl === "string" ? (
      <img width={20} height={20} src={option.iconUrl} alt={option.label} />
    ) : null}
    {option.label}
    {checked && <IconCheck style={{ marginInlineStart: "auto" }} {...iconProps} />}
  </Group>
);

interface LeftSectionProps {
  isPending: boolean;
  currentApp: RouterOutputs["app"]["selectable"][number] | undefined;
}

const size = 20;
const LeftSection = ({ isPending, currentApp }: LeftSectionProps) => {
  if (isPending) {
    return <Loader size={size} />;
  }

  if (currentApp) {
    return <img width={size} height={size} src={currentApp.iconUrl} alt={currentApp.name} />;
  }

  return null;
};

const MemoizedLeftSection = memo(LeftSection);
