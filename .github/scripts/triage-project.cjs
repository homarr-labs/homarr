const states = new Map([
  ["needs triage", "Needs triage"],
  ["specced-out", "Ready to implement"],
  ["waiting-for-reporter", "Waiting for reply"],
  ["needs info from the maintainer", "Needs maintainer"],
  ["wontfix", "Not planned"],
]);
const waiting = "waiting-for-reporter";
const ready = "ready for test";
const aiDisclaimer =
  /^\s*(?:>\s*)?[*_]*(?:This was (?:generated|written|created|assisted|authored) by (?:an? )?AI\b|AI[- ](?:generated|assisted|written|authored) (?:reply|response|comment|message)\b)/i;
const labels = (issue) => issue.labels.map((label) => label.name);
const activeStates = (issue) => labels(issue).filter((label) => states.has(label));
const latestLabel = (events, name) =>
  events
    .filter((event) => event.event === "labeled" && event.label?.name === name)
    .reduce((latest, event) => Math.max(latest, Date.parse(event.created_at)), 0);
const statusFor = (issue) => {
  if (issue.state === "closed") {
    if (issue.state_reason === "not_planned" || labels(issue).includes("wontfix")) return "Not planned";
    return "Done";
  }
  const current = activeStates(issue);
  if (current.length === 0) return "Needs triage";
  if (current.length === 1) return states.get(current[0]);
};

module.exports = async ({ github, context, core }) => {
  const repo = context.repo;
  const read = async (number) => (await github.rest.issues.get({ ...repo, issue_number: number })).data;
  const number = context.payload.issue?.number ?? context.payload.pull_request?.number;
  let targets = [];

  if (number) {
    let comment;
    if (context.eventName === "issue_comment") {
      comment = (await github.rest.issues.getComment({ ...repo, comment_id: context.payload.comment.id })).data;
    }
    const issue = await read(number);
    const current = activeStates(issue);
    let remove = [];
    if (issue.state === "open") {
      if (
        comment &&
        current.length === 1 &&
        current[0] === waiting &&
        comment.user?.id === issue.user.id &&
        comment.user.type === "User" &&
        !comment.user.login.endsWith("[bot]") &&
        !comment.performed_via_github_app &&
        !aiDisclaimer.test(comment.body ?? "")
      ) {
        const events = await github.paginate(github.rest.issues.listEvents, {
          ...repo,
          issue_number: number,
          per_page: 100,
        });
        const waitingSince = latestLabel(events, waiting);
        // A queued old comment must not release a newer request for reporter testing.
        if (waitingSince && Date.parse(comment.created_at) > waitingSince) remove = [waiting];
      }
      if (context.eventName === "pull_request_target" && context.payload.action === "synchronize") {
        const { data: pull } = await github.rest.pulls.get({ ...repo, pull_number: number });
        const pushedAt = Date.parse(context.payload.pull_request.updated_at);
        if (pull.head.sha === context.payload.pull_request.head.sha && Number.isFinite(pushedAt)) {
          const events = await github.paginate(github.rest.issues.listEvents, {
            ...repo,
            issue_number: number,
            per_page: 100,
          });
          // Replays must preserve readiness applied after this push, including ambiguous same-second events.
          remove = labels(issue).filter((label) => {
            if (label !== ready && !(current.length === 1 && label === waiting)) return false;
            const appliedAt = latestLabel(events, label);
            return appliedAt > 0 && appliedAt < pushedAt;
          });
          if (remove.includes(ready) && current.length === 1 && current[0] === "specced-out") {
            const specifiedAt = latestLabel(events, current[0]);
            if (specifiedAt > 0 && specifiedAt < pushedAt) remove.push(current[0]);
          }
        }
      }
      if (remove.length) {
        // Recheck after reading comments/events/PR metadata; never replace the whole label set.
        const fresh = await read(number);
        if (
          fresh.state === "open" &&
          fresh.updated_at === issue.updated_at &&
          JSON.stringify(labels(fresh)) === JSON.stringify(labels(issue))
        ) {
          for (const name of new Set(remove))
            await github.rest.issues.removeLabel({ ...repo, issue_number: number, name });
          const afterRemoval = await read(number);
          if (afterRemoval.state === "open" && activeStates(afterRemoval).length === 0) {
            await github.rest.issues.addLabels({ ...repo, issue_number: number, labels: ["needs triage"] });
          }
        }
      }
    }
    targets = [number];
  } else if (context.eventName === "workflow_dispatch") {
    const input = context.payload.inputs?.number?.trim();
    if (input) {
      if (!/^[1-9]\d*$/.test(input) || !Number.isSafeInteger(Number(input)))
        throw new Error("Enter a positive issue or PR number.");
      targets = [Number(input)];
      const issue = await read(targets[0]);
      if (issue.state === "open" && activeStates(issue).length === 0) {
        await github.rest.issues.addLabels({ ...repo, issue_number: targets[0], labels: ["needs triage"] });
      }
    } else {
      const found = new Set();
      backfill: for (const label of states.keys()) {
        for await (const response of github.paginate.iterator(github.rest.issues.listForRepo, {
          ...repo,
          state: "open",
          labels: label,
          per_page: 100,
        })) {
          for (const issue of response.data) {
            found.add(issue.number);
            if (found.size >= 500) {
              core.warning("Backfill limited to 500 open triaged items. Sync remaining items individually.");
              break backfill;
            }
          }
        }
      }
      targets = [...found];
    }
  }

  if (!process.env.TRIAGE_PROJECT_NUMBER || !process.env.TRIAGE_PROJECT_TOKEN) {
    core.notice(
      "Project sync skipped: configure TRIAGE_PROJECT_NUMBER and App credentials or TRIAGE_PROJECT_TOKEN. Reply label handling remains active.",
    );
    return;
  }
  const projectNumber = Number(process.env.TRIAGE_PROJECT_NUMBER);
  if (!Number.isSafeInteger(projectNumber) || projectNumber < 1)
    throw new Error("TRIAGE_PROJECT_NUMBER must be a positive integer.");
  const graphql = new github.constructor({
    auth: process.env.TRIAGE_PROJECT_TOKEN,
    baseUrl: github.request.endpoint.DEFAULTS.baseUrl,
  }).graphql;
  let project;
  let field;
  let cursor = null;
  do {
    const result = await graphql(
      `
        query ($owner: String!, $number: Int!, $cursor: String) {
          organization(login: $owner) {
            projectV2(number: $number) {
              id
              fields(first: 100, after: $cursor) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `,
      { owner: process.env.TRIAGE_PROJECT_OWNER || "homarr-labs", number: projectNumber, cursor },
    );
    project = result.organization?.projectV2;
    if (!project) throw new Error("Configured organization Project was not found or is inaccessible.");
    field = project.fields.nodes.find((candidate) => candidate?.name === "Status") ?? field;
    cursor = project.fields.pageInfo.endCursor;
  } while (!field && project.fields.pageInfo.hasNextPage);
  const options = new Map(field?.options.map((option) => [option.name, option.id]));
  for (const status of new Set([...states.values(), "Done"])) {
    if (!options.has(status)) throw new Error(`Project Status option missing: ${status}`);
  }
  for (const target of targets) {
    // GITHUB_TOKEN label writes do not start another run; mirror the fresh state here.
    const issue = await read(target);
    if (!statusFor(issue)) {
      core.warning(`#${target}: Project sync skipped because triage state labels conflict.`);
      continue;
    }
    const added = await graphql(
      `
        mutation ($project: ID!, $content: ID!) {
          addProjectV2ItemById(input: { projectId: $project, contentId: $content }) {
            item {
              id
            }
          }
        }
      `,
      { project: project.id, content: issue.node_id },
    );
    const status = statusFor(await read(target));
    if (!status) {
      core.warning(`#${target}: Project Status update skipped because triage state changed.`);
      continue;
    }
    await graphql(
      `
        mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
          updateProjectV2ItemFieldValue(
            input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }
          ) {
            projectV2Item {
              id
            }
          }
        }
      `,
      { project: project.id, item: added.addProjectV2ItemById.item.id, field: field.id, option: options.get(status) },
    );
    core.info(`#${target}: Project Status → ${status}`);
  }
};
