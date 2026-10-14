import path from "node:path";
import { fileURLToPath } from "node:url";
import { API } from "typescript/unstable/async";

const directory = fileURLToPath(new URL("../", import.meta.url));
const config = path.join(directory, "tsconfig.json");
const api = new API({ cwd: process.cwd() });

try {
  const snapshot = await api.updateSnapshot({ openProjects: [config] });
  try {
    const project = snapshot.getProject(config);
    if (!project) throw new Error("Scoped backend project missing");
    const diagnostics = [...(await project.program.getProgramDiagnostics())];
    for (const file of project.rootFiles) {
      diagnostics.push(
        ...(await project.program.getSyntacticDiagnostics(file)),
        ...(await project.program.getSemanticDiagnostics(file)),
      );
    }
    console.log(
      JSON.stringify(
        { revision: "homarr.backend.source-port.v2", scopedFiles: project.rootFiles.length, diagnostics },
        null,
        2,
      ),
    );
    process.exitCode = diagnostics.length === 0 ? 0 : 1;
  } finally {
    await snapshot.dispose();
  }
} finally {
  await api.close();
}
