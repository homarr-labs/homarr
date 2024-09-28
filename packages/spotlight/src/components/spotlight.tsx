"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ActionIcon, Anchor, Center, Group, Kbd } from "@mantine/core";
import { Spotlight as MantineSpotlight } from "@mantine/spotlight";
import { IconSearch, IconX } from "@tabler/icons-react";

import { useSession } from "@homarr/auth/client";
import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { inferSearchInteractionOptions } from "../lib/interaction";
import { searchModes } from "../modes";
import { selectAction, spotlightStore } from "../spotlight-store";
import { SpotlightChildrenActions } from "./actions/children-actions";
import { SpotlightActionGroups } from "./actions/groups/action-group";

export const Spotlight = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<keyof TranslationObject["search"]["mode"]>("help");
  const [childrenOptions, setChildrenOptions] = useState<inferSearchInteractionOptions<"children"> | null>(null);
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.modeKey === mode), [mode]);
  const { data: session } = useSession();

  if (!activeMode) {
    return null;
  }

  return (
    <MantineSpotlight.Root
      onSpotlightClose={() => {
        setMode("help");
        setChildrenOptions(null);
      }}
      query={query}
      onQueryChange={(query) => {
        if (mode !== "help" || query.length !== 1) {
          setQuery(query);
        }

        const modeToActivate = searchModes.find((mode) => mode.character === query);
        if (!modeToActivate) {
          return;
        }

        setMode(modeToActivate.modeKey);
        setQuery("");
        setTimeout(() => selectAction(0, spotlightStore));
      }}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        placeholder={t("common.rtl", {
          value: t("search.placeholder"),
          symbol: "...",
        })}
        ref={inputRef}
        leftSectionWidth={activeMode.modeKey !== "help" ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {activeMode.modeKey !== "help" ? <Kbd size="sm">{activeMode.character}</Kbd> : null}
          </Group>
        }
        rightSection={
          mode === "help" ? undefined : (
            <ActionIcon
              onClick={() => {
                setMode("help");
                setChildrenOptions(null);
                inputRef.current?.focus();
              }}
              variant="subtle"
            >
              <IconX stroke={1.5} />
            </ActionIcon>
          )
        }
        value={query}
        onKeyDown={(event) => {
          if (query.length === 0 && mode !== "help" && event.key === "Backspace") {
            setMode("help");
            setChildrenOptions(null);
          }
        }}
      />

      {childrenOptions ? (
        <Group>
          <childrenOptions.detailComponent options={childrenOptions.option as never} />
        </Group>
      ) : null}

      <MantineSpotlight.ActionsList>
        {childrenOptions ? (
          <SpotlightChildrenActions childrenOptions={childrenOptions} query={query} />
        ) : (
          <SpotlightActionGroups
            setMode={(mode) => {
              setMode(mode);
              setChildrenOptions(null);
              setTimeout(() => selectAction(0, spotlightStore));
            }}
            setChildrenOptions={(options) => {
              setChildrenOptions(options);
              setQuery("");
              setTimeout(() => selectAction(0, spotlightStore));
            }}
            query={query}
            groups={activeMode.groups}
          />
        )}
      </MantineSpotlight.ActionsList>
      {session ? (
        <MantineSpotlight.Footer>
          <Group align="center" justify="space-between">
            <Anchor component={Link} href={`/manage/users/${session.user.id}/search`} size="sm">
              {t("search.settings")}
            </Anchor>
          </Group>
        </MantineSpotlight.Footer>
      ) : null}
    </MantineSpotlight.Root>
  );
};
