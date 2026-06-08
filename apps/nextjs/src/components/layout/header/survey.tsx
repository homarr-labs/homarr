"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Button,
  Checkbox,
  Group,
  Indicator,
  Menu,
  Modal,
  Radio,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconMessageCircle } from "@tabler/icons-react";
import { z } from "zod/v4";

import { parseCookies, setClientCookie } from "@homarr/common";
import { surveyAnsweredCookieKey } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";

const surveySchema = z
  .object({
    features: z.array(z.string()).min(1),
    integration: z.string().min(1),
    integrationOther: z.string().optional(),
    aiImportance: z.string().min(1),
    wishlist: z.string().optional(),
    frustrations: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.integration === "Other" && !data.integrationOther?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Required",
        path: ["integrationOther"],
      });
    }
  });

type SurveyFormValues = z.infer<typeof surveySchema>;

const featureChoices = [
  "Export / import config",
  "MCP (Model Context Protocol) support",
  "New widgets (weather, calendar, RSS, etc.)",
  "New integrations",
  "Custom widgets (create your own)",
  "Automatic mobile layouts / better drag and drop",
] as const;

const integrationChoices = [
  "Home automation (Home Assistant, openHAB, Zigbee2MQTT…)",
  "Media servers (Plex, Jellyfin, Emby, Navidrome…)",
  "Monitoring & observability (Prometheus, Grafana, Uptime Kuma…)",
  "Infrastructure (Proxmox, TrueNAS, Portainer…)",
  "Cloud & productivity (Nextcloud, Paperless, Vaultwarden…)",
  "Other",
] as const;

const aiImportanceChoices = [
  "Very important – I'd use it immediately",
  "Somewhat important – nice to have",
  "Not important – I don't care",
  "I'm not sure what this means yet",
] as const;

const requiredSteps = [0, 1, 2] as const;

const integrationStepValidators: Record<string, (values: SurveyFormValues) => boolean> = {
  Other: (values) => Boolean(values.integrationOther?.trim()),
  ...(Object.fromEntries(
    integrationChoices.filter((choice) => choice !== "Other").map((choice) => [choice, () => true]),
  ) as Record<string, () => true>),
};

const stepValidators: Record<number, (values: SurveyFormValues) => boolean> = {
  0: (values) => values.features.length >= 1,
  1: (values) => integrationStepValidators[values.integration]?.(values) ?? false,
  2: (values) => values.aiImportance.length >= 1,
};

const surveyResponse1Getters: Record<string, (values: SurveyFormValues) => string | undefined> = {
  Other: (values) => values.integrationOther,
};

function createStore<T>(initialValue: T) {
  let value = initialValue;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return value;
    },
    set(nextValue: T) {
      value = nextValue;
      listeners.forEach((listener) => listener());
    },
  };
}

const showSurveyStore = createStore(false);
const surveyModalStore = createStore(false);

function useShowSurvey() {
  const showSurvey = useSyncExternalStore(
    (listener) => showSurveyStore.subscribe(listener),
    () => showSurveyStore.getSnapshot(),
    () => false,
  );

  useEffect(() => {
    const beforeDeadline = new Date() < new Date("2026-07-01");
    const cookies = parseCookies(document.cookie);
    const hasAnswered = cookies[surveyAnsweredCookieKey] !== undefined;

    if (beforeDeadline && !hasAnswered) {
      showSurveyStore.set(true);
    }
  }, []);

  return showSurvey;
}

function useSurveyModalOpen() {
  return useSyncExternalStore(
    (listener) => surveyModalStore.subscribe(listener),
    () => surveyModalStore.getSnapshot(),
    () => false,
  );
}

function isStepValid(step: number, values: SurveyFormValues) {
  const validator = stepValidators[step];
  if (!validator) {
    return true;
  }
  return validator(values);
}

function canNavigateToStep(targetStep: number, activeStep: number, values: SurveyFormValues) {
  if (targetStep <= activeStep) {
    return true;
  }

  return requiredSteps.filter((step) => step < targetStep).every((step) => isStepValid(step, values));
}

function getSurveyResponse1(values: SurveyFormValues) {
  const getter = surveyResponse1Getters[values.integration];
  if (getter) {
    return getter(values);
  }
  return values.integration;
}

function optionalResponse(value: string | undefined) {
  if (value) {
    return value;
  }
  return undefined;
}

const SurveyIndicator = ({ children }: PropsWithChildren) => {
  const showSurvey = useShowSurvey();

  return (
    <Indicator color="grape" size={15} processing withBorder disabled={!showSurvey}>
      {children}
    </Indicator>
  );
};

const SurveyMenuItem = () => {
  const showSurvey = useShowSurvey();

  if (!showSurvey) {
    return null;
  }

  return (
    <Menu.Item
      onClick={() => surveyModalStore.set(true)}
      leftSection={<IconMessageCircle size="1rem" />}
      color="grape"
    >
      Share your feedback
    </Menu.Item>
  );
};

const SurveyModal = () => {
  const showSurvey = useShowSurvey();
  const opened = useSurveyModalOpen();
  const [active, setActive] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const close = () => surveyModalStore.set(false);

  const form = useZodForm(surveySchema, {
    mode: "controlled",
    initialValues: {
      features: [],
      integration: "",
      integrationOther: "",
      aiImportance: "",
      wishlist: "",
      frustrations: "",
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("https://hog.homarr.dev/i/v0/e/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: "phc_pWxeD1hbl4ip02JYReX1Crjkt5DhB3dduigirHMCtFE",
          event: "survey sent",
          distinct_id: crypto.randomUUID(),
          properties: {
            $survey_id: "019ea900-2649-0000-5914-8bdfacc01219",
            $survey_response: values.features,
            $survey_response_1: getSurveyResponse1(values),
            $survey_response_2: values.aiImportance,
            $survey_response_3: optionalResponse(values.wishlist),
            $survey_response_4: optionalResponse(values.frustrations),
          },
        }),
      });

      if (!response.ok) {
        return;
      }

      setClientCookie(surveyAnsweredCookieKey, "true", {
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        path: "/",
      });
      showSurveyStore.set(false);
      close();
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleStepClick = (step: number) => {
    if (step === active) {
      return;
    }

    if (!canNavigateToStep(step, active, form.values)) {
      return;
    }

    setActive(step);
  };

  if (!showSurvey) {
    return null;
  }

  return (
    <Modal opened={opened} onClose={close} size="xl" title="Homarr – Feature feedback & wishlist" centered>
      <Stepper active={active} onStepClick={handleStepClick} orientation="horizontal">
        <Stepper.Step label="Features">
          <Stack gap="md" mt="md">
            <Title order={4}>Which new features would you most like to see in Homarr? (pick all that apply)</Title>
            <Checkbox.Group {...form.getInputProps("features")}>
              <Stack gap="xs">
                {featureChoices.map((choice) => (
                  <Checkbox key={choice} value={choice} label={choice} />
                ))}
              </Stack>
            </Checkbox.Group>
            <Group justify="flex-end">
              <Button color="grape" disabled={!isStepValid(0, form.values)} onClick={() => setActive(1)}>
                Next
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Integrations">
          <Stack gap="md" mt="md">
            <Title order={4}>What type of new integration would benefit you the most?</Title>
            <Radio.Group {...form.getInputProps("integration")}>
              <Stack gap="xs">
                {integrationChoices.map((choice) => (
                  <Radio key={choice} value={choice} label={choice} />
                ))}
              </Stack>
            </Radio.Group>
            {form.values.integration === "Other" && (
              <TextInput label="Please specify" {...form.getInputProps("integrationOther")} />
            )}
            <Group justify="flex-end">
              <Button color="grape" disabled={!isStepValid(1, form.values)} onClick={() => setActive(2)}>
                Next
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="AI">
          <Stack gap="md" mt="md">
            <Title order={4}>
              How important is AI compatibility to you? (e.g. AI widgets, MCP tools, LLM integrations)
            </Title>
            <Radio.Group {...form.getInputProps("aiImportance")}>
              <Stack gap="xs">
                {aiImportanceChoices.map((choice) => (
                  <Radio key={choice} value={choice} label={choice} />
                ))}
              </Stack>
            </Radio.Group>
            <Group justify="flex-end">
              <Button color="grape" disabled={!isStepValid(2, form.values)} onClick={() => setActive(3)}>
                Next
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Wishlist">
          <Stack gap="md" mt="md">
            <Title order={4}>
              Anything else you&apos;d like to see in Homarr? Feel free to describe a feature, integration, or
              improvement you&apos;re missing.
            </Title>
            <Text size="sm" c="dimmed">
              Optional
            </Text>
            <Textarea autosize minRows={3} {...form.getInputProps("wishlist")} />
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setActive(4)}>
                Skip
              </Button>
              <Button color="grape" onClick={() => setActive(4)}>
                Next
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Feedback">
          <Stack gap="md" mt="md">
            <Title order={4}>
              What frustrates you most about Homarr today? Any small fix or quality-of-life improvement you wish it
              already did?
            </Title>
            <Text size="sm" c="dimmed">
              Optional
            </Text>
            <Textarea autosize minRows={3} {...form.getInputProps("frustrations")} />
            <Group justify="flex-end">
              <Button variant="subtle" color="gray" loading={isSubmitting} onClick={handleSubmit}>
                Skip & Submit
              </Button>
              <Button color="grape" loading={isSubmitting} onClick={handleSubmit}>
                Submit
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Modal>
  );
};

export { SurveyIndicator, SurveyMenuItem, SurveyModal };
