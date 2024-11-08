import Link from "next/link";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconPencil, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getI18n, getScopedI18n } from "@homarr/translation/server";
import { SearchInput, TablePagination } from "@homarr/ui";
import { z } from "@homarr/validation";

import { ManageContainer } from "~/components/manage/manage-container";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { SearchEngineDeleteButton } from "./_search-engine-delete-button";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  pageSize: z.string().regex(/\d+/).transform(Number).catch(10),
  page: z.string().regex(/\d+/).transform(Number).catch(1),
});

type SearchParamsSchemaInputFromSchema<TSchema extends Record<string, unknown>> = Partial<{
  [K in keyof TSchema]: Exclude<TSchema[K], undefined> extends unknown[] ? string[] : string;
}>;

interface SearchEnginesPageProps {
  searchParams: SearchParamsSchemaInputFromSchema<z.infer<typeof searchParamsSchema>>;
}

export default async function SearchEnginesPage(props: SearchEnginesPageProps) {
  const searchParams = searchParamsSchema.parse(props.searchParams);
  const { items: searchEngines, totalCount } = await api.searchEngine.getPaginated(searchParams);

  const tEngine = await getScopedI18n("search.engine");

  return (
    <ManageContainer>
      <DynamicBreadcrumb />
      <Stack>
        <Title>{tEngine("page.list.title")}</Title>
        <Group justify="space-between" align="center">
          <SearchInput placeholder={`${tEngine("search")}...`} defaultValue={searchParams.search} />
          <MobileAffixButton component={Link} href="/manage/search-engines/new">
            {tEngine("page.create.title")}
          </MobileAffixButton>
        </Group>
        {searchEngines.length === 0 && <SearchEngineNoResults />}
        {searchEngines.length > 0 && (
          <Stack gap="sm">
            {searchEngines.map((searchEngine) => (
              <SearchEngineCard key={searchEngine.id} searchEngine={searchEngine} />
            ))}
          </Stack>
        )}

        <Group justify="end">
          <TablePagination total={Math.ceil(totalCount / searchParams.pageSize)} />
        </Group>
      </Stack>
    </ManageContainer>
  );
}

interface SearchEngineCardProps {
  searchEngine: RouterOutputs["searchEngine"]["getPaginated"]["items"][number];
}

const SearchEngineCard = async ({ searchEngine }: SearchEngineCardProps) => {
  const t = await getScopedI18n("search.engine");

  return (
    <Card>
      <Group justify="space-between" wrap="nowrap">
        <Group align="top" justify="start" wrap="nowrap" style={{ flex: 1 }}>
          <Avatar
            size="sm"
            src={searchEngine.iconUrl}
            radius={0}
            styles={{
              image: {
                objectFit: "contain",
              },
            }}
          />
          <Stack gap={0}>
            <Text fw={500} lineClamp={1}>
              {searchEngine.name}
            </Text>
            {searchEngine.description && (
              <Text size="sm" c="gray.6" lineClamp={4}>
                {searchEngine.description}
              </Text>
            )}
            {searchEngine.type === "generic" && searchEngine.urlTemplate !== null && (
              <Anchor href={searchEngine.urlTemplate.replace("%s", "test")} lineClamp={1} size="sm">
                {searchEngine.urlTemplate}
              </Anchor>
            )}
            {searchEngine.type === "fromIntegration" && searchEngine.integrationId !== null && (
              <Text c="dimmed" size="sm">
                {t("page.list.interactive")}
              </Text>
            )}
          </Stack>
        </Group>
        <Group>
          <ActionIconGroup>
            <ActionIcon
              component={Link}
              href={`/manage/search-engines/edit/${searchEngine.id}`}
              variant="subtle"
              color="gray"
              aria-label={t("page.edit.title")}
            >
              <IconPencil size={16} stroke={1.5} />
            </ActionIcon>
            <SearchEngineDeleteButton searchEngine={searchEngine} />
          </ActionIconGroup>
        </Group>
      </Group>
    </Card>
  );
};

const SearchEngineNoResults = async () => {
  const t = await getI18n();

  return (
    <Card withBorder bg="transparent">
      <Stack align="center" gap="sm">
        <IconSearch size="2rem" />
        <Text fw={500} size="lg">
          {t("search.engine.page.list.noResults.title")}
        </Text>
        <Anchor href="/manage/search-engines/new">{t("search.engine.page.list.noResults.action")}</Anchor>
      </Stack>
    </Card>
  );
};
