"use client";

// Throwaway question: is a compare-first, run-first, or review-first sanity workbench easiest to judge?
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionIcon, Badge, Button, Group, Paper, SegmentedControl, Stack, Table, Text, Title } from "@mantine/core";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconChevronRight,
  IconFlask,
  IconPlayerPlay,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import classes from "./_prototype.module.css";

type Candidate = "regression" | "hotfix";
type Variant = "A" | "B" | "C";
type CaptureView = "reference" | "candidate" | "difference";
const variants: Variant[] = ["A", "B", "C"];
const variantNames = { A: "Compare first", B: "Run first", C: "Review first" };
const steps = ["Seed board", "Resize", "Save & reload", "Compare"];
const scenarios = [
  {
    id: "empty",
    name: "Empty container",
    dimensions: "2 × 1",
    regression: "2 × 2",
    detail: "An empty container keeps its saved height.",
  },
  {
    id: "populated",
    name: "Container with items",
    dimensions: "2 × 1",
    regression: "2 × 2",
    detail: "Adding items preserves the outer footprint.",
  },
  {
    id: "labeled",
    name: "Container with a title",
    dimensions: "2 × 1",
    regression: "2 × 2",
    detail: "A title does not add a row to the saved size.",
  },
  {
    id: "large",
    name: "Larger container",
    dimensions: "4 × 2",
    regression: "4 × 3",
    detail: "Existing larger containers keep their dimensions.",
  },
  {
    id: "scrollable",
    name: "Scrollable container",
    dimensions: "2 × 1",
    regression: "2 × 1",
    detail: "Overflow stays inside the selected height.",
  },
] as const;
type Scenario = (typeof scenarios)[number];
type Model = {
  candidate: Candidate;
  selected: Scenario;
  select: (scenario: Scenario) => void;
  step: number;
  setStep: (step: number) => void;
  replayed: boolean;
  replay: () => void;
  reviewer: string;
  review: (decision: string) => void;
};

function observed(scenario: Scenario, candidate: Candidate) {
  if (candidate === "regression") return scenario.regression;
  return scenario.dimensions;
}

function Result({ scenario, candidate }: { scenario: Scenario; candidate: Candidate }) {
  if (observed(scenario, candidate) !== scenario.dimensions) {
    return (
      <Badge color="red" variant="light" leftSection={<IconX size={11} />}>
        Fails
      </Badge>
    );
  }
  return (
    <Badge color="teal" variant="light" leftSection={<IconCheck size={11} />}>
      Passes
    </Badge>
  );
}

function Capture({ candidate, view = "candidate" }: { candidate: Candidate; view?: CaptureView }) {
  let source = "/prototypes/sanity/container-after.png";
  if (candidate === "regression" && view !== "reference") source = "/prototypes/sanity/container-before.png";
  let label = `Candidate (${candidate} capture)`;
  if (view === "reference") label = "Known-good reference (hotfix capture)";
  if (view === "difference") label = "Pixel difference · full board";
  return (
    <figure className={classes.capture}>
      <figcaption>
        <span>{label}</span>
        <span>1280 × 900</span>
      </figcaption>
      <div className={classes.imageFrame} data-difference={view === "difference"}>
        <img src={source} width={1280} height={900} alt={label} className={classes.captureImage} />
        {view === "difference" && (
          <img
            src="/prototypes/sanity/container-after.png"
            width={1280}
            height={900}
            alt="Known-good capture overlaid with difference blending"
            className={classes.differenceImage}
          />
        )}
      </div>
    </figure>
  );
}

function Evidence({ candidate }: { candidate: Candidate }) {
  const [view, setView] = useState("pair");
  return (
    <Stack gap="xs">
      <Group justify="space-between" gap="xs">
        <Text size="sm" fw={600}>
          Recorded board
        </Text>
        <SegmentedControl
          size="xs"
          value={view}
          onChange={setView}
          data={[
            { value: "pair", label: "Before / after" },
            { value: "difference", label: "Difference" },
          ]}
        />
      </Group>
      {view === "pair" && (
        <div className={classes.capturePair}>
          <Capture candidate={candidate} view="reference" />
          <Capture candidate={candidate} />
        </div>
      )}
      {view === "difference" && <Capture candidate={candidate} view="difference" />}
      <Text size="xs" c="dimmed">
        Same full-board captures for all five cases. Measurements below identify the selected case; the difference
        includes surrounding UI.
      </Text>
    </Stack>
  );
}

function Measurements({ model }: { model: Model }) {
  return (
    <div className={classes.measurements}>
      <div>
        <Text size="xs" c="dimmed">
          Saved / expected
        </Text>
        <Text className={classes.dimension}>{model.selected.dimensions}</Text>
      </div>
      <IconArrowRight size={18} aria-hidden />
      <div>
        <Text size="xs" c="dimmed">
          Observed in capture
        </Text>
        <Text
          className={classes.dimension}
          data-failed={observed(model.selected, model.candidate) !== model.selected.dimensions}
        >
          {observed(model.selected, model.candidate)}
        </Text>
      </div>
      <Result scenario={model.selected} candidate={model.candidate} />
    </div>
  );
}

function Review({ model }: { model: Model }) {
  const blocked = model.candidate === "regression";
  let title = "Dimensions preserved · appearance review pending";
  let description =
    "An independent reviewer checks unexplained visual changes. This button only simulates that decision.";
  if (blocked) {
    title = "Blocked · 4 size contracts fail";
    description =
      "Saved sizes changed. Appearance approval cannot override this failure; fix the behavior or ask the maintainer to change the contract.";
  } else if (model.reviewer === "Accepted appearance") {
    title = "Example accepted · no release action";
  } else if (model.reviewer === "Needs investigation") {
    title = "Held for investigation";
  }
  return (
    <Paper withBorder p="sm" className={classes.review} data-blocked={blocked}>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconShieldCheck size={19} />
        <div>
          <Text size="sm" fw={600}>
            {title}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {description}
          </Text>
        </div>
      </Group>
      <Group mt="sm" gap="xs">
        <Button
          size="xs"
          variant="light"
          disabled={blocked || !model.replayed}
          onClick={() => model.review("Accepted appearance")}
        >
          Approve appearance (simulation)
        </Button>
        <Button size="xs" variant="subtle" color="gray" onClick={() => model.review("Needs investigation")}>
          Flag for investigation
        </Button>
      </Group>
      {!blocked && !model.replayed && (
        <Text size="xs" c="dimmed" mt="xs">
          Replay the example to enable the simulated review.
        </Text>
      )}
    </Paper>
  );
}

function ReplaySteps({ model }: { model: Model }) {
  return (
    <div className={classes.steps} aria-label="Simulated replay stages">
      {steps.map((step, index) => (
        <button
          key={step}
          type="button"
          className={classes.step}
          data-active={model.step === index}
          onClick={() => model.setStep(index)}
        >
          <span>{index + 1}</span>
          {step}
        </button>
      ))}
    </div>
  );
}

export function VariantA({ model }: { model: Model }) {
  return (
    <div className={classes.compareWorkspace}>
      <Paper withBorder className={classes.scenarioSidebar}>
        <div className={classes.sidebarHeading}>
          <Text size="sm" fw={600}>
            Selected checks
          </Text>
          <Text size="xs" c="dimmed">
            5 cases · container layout
          </Text>
        </div>
        {scenarios.map((scenario) => (
          <button
            type="button"
            key={scenario.id}
            className={classes.scenarioButton}
            data-active={model.selected.id === scenario.id}
            onClick={() => model.select(scenario)}
          >
            <span>
              <strong>{scenario.name}</strong>
              <small>{scenario.dimensions} · save / reload</small>
            </span>
            <Result scenario={scenario} candidate={model.candidate} />
          </button>
        ))}
        <div className={classes.sidebarHeading}>
          <Text size="xs" c="dimmed">
            Why these checks?
          </Text>
          <Text size="xs" mt={4}>
            section-grid.tsx changed
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Shared container sizing selects all five board cases.
          </Text>
        </div>
      </Paper>
      <Stack gap="md" className={classes.workspaceMain}>
        <Group justify="space-between">
          <div>
            <Text fw={600}>{model.selected.name}</Text>
            <Text size="sm" c="dimmed">
              {model.selected.detail}
            </Text>
          </div>
          <Result scenario={model.selected} candidate={model.candidate} />
        </Group>
        <Evidence candidate={model.candidate} />
        <Paper withBorder p="sm">
          <Measurements model={model} />
          <ReplaySteps model={model} />
        </Paper>
        <Review model={model} />
      </Stack>
    </div>
  );
}

export function VariantB({ model }: { model: Model }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Group justify="space-between">
          <div>
            <Text fw={600}>Change → selected checks</Text>
            <Text size="sm" c="dimmed">
              section-grid.tsx → container layout → 5 board cases
            </Text>
          </div>
          <Badge variant="light" color="gray">
            Chromium · Linux
          </Badge>
        </Group>
      </Paper>
      <Paper withBorder className={classes.tablePanel}>
        <Table.ScrollContainer minWidth={650}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Selected scenario</Table.Th>
                <Table.Th>Expected</Table.Th>
                <Table.Th>Observed</Table.Th>
                <Table.Th>Recorded result</Table.Th>
                <Table.Th>Inspect</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {scenarios.map((scenario) => (
                <Table.Tr key={scenario.id} data-selected={model.selected.id === scenario.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {scenario.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Resize → save → reload
                    </Text>
                  </Table.Td>
                  <Table.Td>{scenario.dimensions}</Table.Td>
                  <Table.Td>{observed(scenario, model.candidate)}</Table.Td>
                  <Table.Td>
                    <Result scenario={scenario} candidate={model.candidate} />
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      onClick={() => {
                        model.select(scenario);
                        setExpanded(true);
                      }}
                      rightSection={<IconChevronRight size={13} />}
                    >
                      Details
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
      <Paper withBorder p="md">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            {model.selected.name} · evidence
          </Text>
          <Button size="compact-xs" variant="subtle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded && "Hide detail"}
            {!expanded && "Show detail"}
          </Button>
        </Group>
        {expanded && (
          <Stack gap="md" mt="sm">
            <Text size="sm" c="dimmed">
              {model.selected.detail}
            </Text>
            <Measurements model={model} />
            <ReplaySteps model={model} />
            <Evidence candidate={model.candidate} />
          </Stack>
        )}
      </Paper>
      <Review model={model} />
    </Stack>
  );
}

export function VariantC({ model }: { model: Model }) {
  const [view, setView] = useState<CaptureView>("candidate");
  return (
    <Stack gap="md">
      <ReplaySteps model={model} />
      <div className={classes.reviewWorkspace}>
        <Stack gap="sm" className={classes.workspaceMain}>
          <Group justify="space-between">
            <Text fw={600}>{model.selected.name}</Text>
            <SegmentedControl
              size="xs"
              value={view}
              onChange={(value) => setView(value as CaptureView)}
              data={[
                { value: "reference", label: "Reference" },
                { value: "candidate", label: "Candidate" },
                { value: "difference", label: "Difference" },
              ]}
            />
          </Group>
          <Capture candidate={model.candidate} view={view} />
          <Text size="xs" c="dimmed">
            Recorded full board. Selecting a case changes the inspector, not the captured screen.
          </Text>
          <div className={classes.filmstrip}>
            {scenarios.map((scenario, index) => (
              <button
                type="button"
                className={classes.filmstripItem}
                data-active={model.selected.id === scenario.id}
                key={scenario.id}
                onClick={() => model.select(scenario)}
              >
                <span className={classes.filmstripIndex}>{index + 1}</span>
                <strong>{scenario.name}</strong>
                <small>{scenario.dimensions}</small>
                <Result scenario={scenario} candidate={model.candidate} />
              </button>
            ))}
          </div>
        </Stack>
        <Stack gap="md">
          <Paper withBorder p="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Inspector
            </Text>
            <Text fw={600} mt="sm">
              Keep saved dimensions
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              {model.selected.detail}
            </Text>
            <Measurements model={model} />
            <Text size="xs" c="dimmed" mt="sm">
              Selected because section-grid.tsx changed.
            </Text>
          </Paper>
          <Review model={model} />
        </Stack>
      </div>
    </Stack>
  );
}

function PrototypeSwitcher({ variant, change }: { variant: Variant; change: (direction: number) => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "form, input, textarea, select, [contenteditable], [role='slider'], [role='tablist'], [role='radiogroup']",
        )
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        change(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        change(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [change]);
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className={classes.switcher}>
      <ActionIcon variant="subtle" color="gray" aria-label="Previous prototype layout" onClick={() => change(-1)}>
        <IconArrowLeft size={18} />
      </ActionIcon>
      <div>
        <Text size="xs" c="dimmed">
          Prototype layout
        </Text>
        <Text size="sm" fw={600}>
          {variant} · {variantNames[variant]}
        </Text>
      </div>
      <ActionIcon variant="subtle" color="gray" aria-label="Next prototype layout" onClick={() => change(1)}>
        <IconArrowRight size={18} />
      </ActionIcon>
    </div>
  );
}

export function SanityWorkbenchPrototype() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedVariant = searchParams.get("variant");
  let variant: Variant = "A";
  if (requestedVariant === "B" || requestedVariant === "C") variant = requestedVariant;
  const [candidate, setCandidate] = useState<Candidate>("regression");
  const [selected, select] = useState<Scenario>(scenarios[0]);
  const [step, setStep] = useState(3);
  const [replayed, setReplayed] = useState(false);
  const [reviewer, review] = useState("Pending independent review");
  const replay = () => {
    setReplayed(true);
    setStep(3);
    review("Pending independent review");
  };
  const changeCandidate = (value: string) => {
    setCandidate(value as Candidate);
    setReplayed(false);
    review("Pending independent review");
  };
  const changeVariant = (direction: number) => {
    const next = variants[(variants.indexOf(variant) + direction + variants.length) % variants.length] ?? "A";
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const model: Model = { candidate, selected, select, step, setStep, replayed, replay, reviewer, review };
  const state = {
    variant,
    candidate,
    selectedCase: selected.id,
    step: steps[step],
    expectedDimensions: selected.dimensions,
    observedDimensions: observed(selected, candidate),
    selectedCheckCount: scenarios.length,
    runner: "simulated",
    replayed,
    reviewerDecision: reviewer,
    releaseActions: "none",
  };
  return (
    <div className={classes.root}>
      <div className={classes.prototypeNotice}>
        <IconFlask size={16} />
        <strong>Prototype</strong>
        <span>Recorded captures · simulated runner · no release actions</span>
      </div>
      <Group justify="space-between" align="flex-start" mb="md" gap="md">
        <div>
          <Title order={2}>Sanity workbench</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Did this change preserve the board we already had?
          </Text>
        </div>
        <Badge color="gray" variant="outline" mt={5}>
          Container sizing example
        </Badge>
      </Group>
      <Paper withBorder p="sm" mb="md">
        <Group justify="space-between" gap="sm">
          <Group gap="sm">
            <Text size="sm" fw={500}>
              Example candidate
            </Text>
            <SegmentedControl
              size="sm"
              value={candidate}
              onChange={changeCandidate}
              data={[
                { value: "regression", label: "Regression" },
                { value: "hotfix", label: "Hotfix" },
              ]}
            />
          </Group>
          <Button leftSection={<IconPlayerPlay size={15} />} onClick={replay}>
            Replay selected checks
          </Button>
        </Group>
        <Text size="xs" c="dimmed" mt="xs" aria-live="polite">
          {!replayed &&
            "Explore recorded evidence, then replay the simulated flow. Five mapped checks; no real browser run starts here."}
          {replayed &&
            "Simulation complete: seed → resize → save & reload → compare. The images remain recorded captures; persistence was not tested by this prototype."}
        </Text>
      </Paper>
      {variant === "A" && <VariantA model={model} />}
      {variant === "B" && <VariantB model={model} />}
      {variant === "C" && <VariantC model={model} />}
      <details className={classes.state}>
        <summary>
          Prototype state · {variantNames[variant]} · {candidate} · {selected.name}
        </summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>
      <PrototypeSwitcher variant={variant} change={changeVariant} />
    </div>
  );
}
