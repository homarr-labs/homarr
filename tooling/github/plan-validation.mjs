import { appendFileSync, readFileSync } from "node:fs";

const plan = JSON.parse(readFileSync(process.argv[2], "utf8"));
const tasks = plan.tasks.filter((task) => task.command && task.command !== "<NONEXISTENT>");
const workspaceTasks = tasks.filter((task) => task.task === "lint" || task.task === "build").map((task) => task.taskId);
const typechecks = tasks
  .filter((task) => task.task === "typecheck")
  .map((task) => task.taskId)
  .toSorted();
const shards = Array.from({ length: Math.min(4, typechecks.length) }, (_, index) => ({
  shard: String(index + 1),
  tasks: [],
}));
for (const [index, task] of typechecks.entries()) {
  shards[index % shards.length].tasks.push(task);
}

const outputs = {
  "workspace-tasks": JSON.stringify(workspaceTasks),
  "builds-app": String(workspaceTasks.includes("@homarr/nextjs#build")),
  "typecheck-matrix": JSON.stringify({ include: shards }),
  "has-typechecks": String(typechecks.length > 0),
};
for (const [key, value] of Object.entries(outputs)) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
