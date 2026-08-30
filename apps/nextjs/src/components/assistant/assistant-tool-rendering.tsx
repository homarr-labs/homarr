"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useId, useState } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { ChainOfThoughtPrimitive } from "@assistant-ui/react";
import {
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Image,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconChevronDown, IconLink, IconRobot, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { useAssistantAutomaticAction } from "./assistant-auto-approval";
import { AssistantDotMatrix } from "./assistant-dot-matrix";
import { hasModifiedLinkClick, ReasoningVisibilityContext } from "./assistant-message-content";
import { useAssistantReasoningState } from "./assistant-reasoning-state";
import { getAssistantIconSearchQuery } from "./assistant-tool-label";
import { getToolResultPresentation } from "./assistant-tool-result";
import { getAssistantToolTraceTarget } from "./assistant-tool-trace";

const formatToolResultValue = (value: string | number | boolean) =>
  typeof value === "number" ? value.toLocaleString() : String(value);

const ToolResultPresentation = ({ result, toolName }: { result: unknown; toolName: string }) => {
  const presentation = getToolResultPresentation(result, { toolName });
  if (!presentation) return null;

  if (presentation.type === "text") {
    return (
      <Text size="sm" className={classes.toolResultText}>
        {presentation.text}
      </Text>
    );
  }

  if (presentation.type === "properties") {
    return (
      <Box className={classes.toolResultProperties}>
        {presentation.fields.map((field) => (
          <Box key={field.label} className={classes.toolResultProperty}>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {field.label}
            </Text>
            <Text size="sm" fw={600} lineClamp={2}>
              {formatToolResultValue(field.value)}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  if (presentation.type === "icons") {
    if (presentation.items.length === 0) return null;
    const hiddenCount = Math.max(0, presentation.totalCount - presentation.items.length);

    return (
      <Box className={classes.toolResultIconCollection}>
        {presentation.items.map((item) => (
          <Box key={`${item.repository ?? "icon"}-${item.url}`} className={classes.toolResultIconItem}>
            <Box className={classes.toolResultIconPreview}>
              <Image
                src={item.url}
                alt={item.name}
                className={classes.toolResultIconImage}
                fit="contain"
                loading="lazy"
              />
            </Box>
            <Group gap={4} mt="xs" wrap="nowrap" justify="space-between">
              <Text size="xs" fw={650} lineClamp={1} title={item.name}>
                {item.name}
              </Text>
              <Badge size="xs" variant="light" color="gray" flex="0 0 auto">
                {item.variant}
              </Badge>
            </Group>
            {item.repository && (
              <Text size="xs" c="dimmed" lineClamp={1} title={item.repository}>
                {item.repository}
              </Text>
            )}
          </Box>
        ))}
        {hiddenCount > 0 && (
          <Badge className={classes.toolResultMore} size="sm" variant="outline" color="gray">
            +{hiddenCount}
          </Badge>
        )}
      </Box>
    );
  }

  const hiddenCount = Math.max(0, presentation.totalCount - presentation.items.length);
  return (
    <Box className={classes.toolResultCollection}>
      {presentation.items.map((item, index) => (
        <Box key={`${item.title}-${index}`} className={classes.toolResultItem}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Box className={classes.toolResultIdentity}>
              <Text size="sm" fw={650} lineClamp={1}>
                {item.title}
              </Text>
              {item.description && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.description}
                </Text>
              )}
            </Box>
            {item.badges.length > 0 && (
              <Group gap={4} wrap="nowrap">
                {item.badges.map((badge) => (
                  <Badge key={badge} size="xs" variant="light" color="gray">
                    {badge}
                  </Badge>
                ))}
              </Group>
            )}
          </Group>
          {item.fields.length > 0 && (
            <Group gap="xs" mt={6} wrap="wrap">
              {item.fields.map((field) => (
                <Text key={field.label} size="xs" c="dimmed">
                  {field.label}:{" "}
                  <Text component="span" inherit c="var(--mantine-color-text)" fw={600}>
                    {formatToolResultValue(field.value)}
                  </Text>
                </Text>
              ))}
            </Group>
          )}
        </Box>
      ))}
      {hiddenCount > 0 && (
        <Badge className={classes.toolResultMore} size="sm" variant="outline" color="gray">
          +{hiddenCount}
        </Badge>
      )}
    </Box>
  );
};

const getToolResultNavigation = (result: unknown) => {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return [];

  const record = result as Record<string, unknown>;
  const candidates = [
    { href: record.previewPath, translationKey: "toolNavigation.openPreview" as const },
    { href: record.managementPath, translationKey: "toolNavigation.openWidget" as const },
  ];

  return candidates.filter(
    (candidate): candidate is { href: string; translationKey: (typeof candidate)["translationKey"] } =>
      typeof candidate.href === "string" && candidate.href.startsWith("/") && !candidate.href.startsWith("//"),
  );
};

const ToolResultNavigation = ({ result }: { result: unknown }) => {
  const t = useI18n("assistant");
  const router = useRouter();
  const links = getToolResultNavigation(result);

  if (links.length === 0) return null;

  return (
    <Group className={classes.toolResultNavigation} gap="xs" wrap="wrap">
      {links.map((link) => (
        <Button
          key={`${link.translationKey}-${link.href}`}
          component="a"
          href={link.href}
          size="compact-xs"
          variant="light"
          leftSection={<IconLink size={13} aria-hidden />}
          onMouseEnter={() => router.prefetch(link.href)}
          onFocus={() => router.prefetch(link.href)}
          onClick={(event) => {
            if (hasModifiedLinkClick(event)) return;
            event.preventDefault();
            router.push(link.href);
          }}
        >
          {t(link.translationKey)}
        </Button>
      ))}
    </Group>
  );
};

const ToolResultPreview = ({ result, toolName }: { result: unknown; toolName: string }) => {
  const navigation = getToolResultNavigation(result);
  if (navigation.length === 0) return <ToolResultPresentation result={result} toolName={toolName} />;

  return (
    <Stack gap="xs">
      <ToolResultPresentation result={result} toolName={toolName} />
      <ToolResultNavigation result={result} />
    </Stack>
  );
};

const AgentTraceToolContext = createContext(false);

const getToolStatusPresentation = (denied: boolean, failed: boolean, successful: boolean) => {
  if (denied || failed) return { color: "red", Icon: IconX } as const;
  if (successful) return { color: "green", Icon: IconCheck } as const;
  return { color: "gray", Icon: IconRobot } as const;
};

export const ToolPart = ({
  toolCallId,
  toolName,
  args,
  result,
  isError,
  status,
  approval,
  respondToApproval,
  timing,
}: ToolCallMessagePartProps) => {
  const t = useI18n("assistant");
  const compact = useContext(AgentTraceToolContext);
  const [opened, setOpened] = useState(false);
  const [approvalResponse, setApprovalResponse] = useState<"approve" | "deny" | null>(null);
  const completed = status?.type === "complete";
  const awaitingApproval = approval !== undefined && approval.approved === undefined && !approval.resolution;
  const denied = approval?.approved === false;
  const failed =
    !denied &&
    (isError === true ||
      status?.type === "incomplete" ||
      (typeof result === "object" && result !== null && "error" in result));
  const successful = completed && !denied && !failed;
  const compactPresentation = compact && !awaitingApproval;
  const traceTarget = getAssistantToolTraceTarget(args);
  const iconSearchQuery = getAssistantIconSearchQuery(toolName, args);
  let displayName = toolName.replaceAll("_", " ");
  if (iconSearchQuery !== null) {
    displayName =
      iconSearchQuery.length > 0
        ? t("toolActivity.iconSearch", { query: iconSearchQuery })
        : t("toolActivity.iconBrowse");
  }
  const duration = timing?.completedAt !== undefined ? Math.max(0, timing.completedAt - timing.startedAt) : undefined;
  const { color: statusColor, Icon: StatusIcon } = getToolStatusPresentation(denied, failed, successful);
  let statusLabel = t("working");
  if (successful) statusLabel = t("complete");
  if (failed) statusLabel = t("failed");
  if (denied) statusLabel = t("denied");
  if (awaitingApproval) statusLabel = t("approvalRequired");
  const autoApprovalInProgress = useAssistantAutomaticAction({
    toolCallId,
    ready: awaitingApproval,
    completed: !awaitingApproval,
    confirm: () => {
      respondToApproval({ approved: true, reason: "Approved automatically by the user." });
    },
  });

  return (
    <Box className={classes.tool} data-compact={compactPresentation || undefined}>
      <UnstyledButton
        className={classes.toolHeader}
        onClick={() => setOpened((current) => !current)}
        aria-expanded={opened}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon size="sm" radius="xl" variant="light" color={statusColor}>
              <StatusIcon size={13} />
            </ThemeIcon>
            <Box miw={0}>
              <Text size={compactPresentation ? "xs" : "sm"} fw={650} lineClamp={1}>
                {displayName}
              </Text>
              {compactPresentation && traceTarget && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {traceTarget}
                </Text>
              )}
            </Box>
          </Group>
          <Group gap={6} wrap="nowrap">
            {duration !== undefined && (
              <Text size="xs" c="dimmed">
                {duration < 1000 ? `${duration} ms` : `${(duration / 1000).toFixed(1)} s`}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {statusLabel}
            </Text>
            <IconChevronDown
              size={14}
              className={classes.disclosureIcon}
              data-opened={opened || awaitingApproval || undefined}
            />
          </Group>
        </Group>
      </UnstyledButton>
      {awaitingApproval && (
        <Box className={classes.approvalPanel}>
          <Text size="sm" fw={600}>
            {t("approvalDescription")}
          </Text>
          <ToolResultPreview result={args} toolName={toolName} />
          {autoApprovalInProgress ? (
            <Group className={classes.autoApprovalProgress} gap="sm" wrap="nowrap">
              <Loader type="bars" size="sm" color="green" />
              <Text size="sm" fw={600}>
                {t("autoApproval.approving")}
              </Text>
            </Group>
          ) : (
            <Group className={classes.approvalActions} gap="sm" grow wrap="nowrap">
              <Button
                size="md"
                fullWidth
                leftSection={<IconCheck size={18} />}
                loading={approvalResponse === "approve"}
                disabled={approvalResponse !== null}
                onClick={() => {
                  setApprovalResponse("approve");
                  respondToApproval({ approved: true });
                }}
              >
                {t("approveAndRun")}
              </Button>
              <Button
                size="md"
                fullWidth
                variant="default"
                leftSection={<IconX size={18} />}
                loading={approvalResponse === "deny"}
                disabled={approvalResponse !== null}
                onClick={() => {
                  setApprovalResponse("deny");
                  respondToApproval({ approved: false });
                }}
              >
                {t("deny")}
              </Button>
            </Group>
          )}
        </Box>
      )}
      {!compactPresentation && successful && result !== undefined && (
        <ToolResultPreview result={result} toolName={toolName} />
      )}
      <Collapse expanded={opened}>
        <Stack gap="xs" mt="sm">
          {compactPresentation && successful && result !== undefined && (
            <ToolResultPreview result={result} toolName={toolName} />
          )}
          <Box>
            <Text size="xs" fw={600} c="dimmed">
              {t("toolInput")}
            </Text>
            <Text className={classes.codeBlock} size="xs" component="pre">
              {JSON.stringify(args, null, 2)}
            </Text>
          </Box>
          {!denied && result !== undefined && (
            <Box>
              <Text size="xs" fw={600} c="dimmed">
                {t("toolOutput")}
              </Text>
              <Text className={classes.codeBlock} size="xs" component="pre">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </Text>
            </Box>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
};

export const AgentTraceToolGroup = ({ children }: { children?: ReactNode }) => (
  <AgentTraceToolContext.Provider value>
    <Stack className={classes.agentTraceTools} gap={4}>
      {children}
    </Stack>
  </AgentTraceToolContext.Provider>
);

const ChainOfThoughtLayout = ({ children }: { children?: ReactNode }) => (
  <Stack className={classes.reasoningParts} gap={6}>
    {children}
  </Stack>
);

export const AssistantChainOfThought = ({ children }: { children?: ReactNode }) => {
  const t = useI18n("assistant");
  const contentId = useId();
  const { collapsed: preferredCollapsed, setCollapsed: setPreferredCollapsed } = useContext(ReasoningVisibilityContext);
  const { chainStatus, collapsed } = useAssistantReasoningState(preferredCollapsed);
  const running = chainStatus.type === "running";

  return (
    <ChainOfThoughtPrimitive.Root className={classes.reasoning} data-opened={!collapsed || undefined}>
      <ChainOfThoughtPrimitive.AccordionTrigger asChild>
        <UnstyledButton
          className={classes.reasoningToggle}
          type="button"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setPreferredCollapsed(!collapsed)}
        >
          <Group gap="xs" wrap="nowrap">
            {(running || chainStatus.type === "requires-action") && (
              <AssistantDotMatrix state={running ? "thinking" : "waiting"} role="presentation" aria-hidden />
            )}
            <Text size="xs" fw={650} c="dimmed">
              {t("reasoning")}
            </Text>
          </Group>
          <IconChevronDown size={14} className={classes.reasoningChevron} />
        </UnstyledButton>
      </ChainOfThoughtPrimitive.AccordionTrigger>
      <Box id={contentId} className={classes.reasoningContent} aria-busy={running} hidden={collapsed}>
        <ChainOfThoughtLayout>{children}</ChainOfThoughtLayout>
      </Box>
    </ChainOfThoughtPrimitive.Root>
  );
};
