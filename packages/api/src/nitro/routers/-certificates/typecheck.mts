import path from "node:path";
import { fileURLToPath } from "node:url";
import { API } from "typescript/unstable/async";

const config = fileURLToPath(new URL("./tsconfig.json", import.meta.url));
const api = new API({ cwd: process.cwd() });
try {
  const snapshot = await api.updateSnapshot({ openProjects: [config] });
  try {
    const project = snapshot.getProject(config);
    if (!project) throw new Error("Certificate scoped project missing");
    const diagnostics = [...(await project.program.getProgramDiagnostics())];
    for (const file of project.rootFiles)
      diagnostics.push(
        ...(await project.program.getSyntacticDiagnostics(file)),
        ...(await project.program.getSemanticDiagnostics(file)),
      );
    console.log(
      JSON.stringify(
        {
          scopedFiles: project.rootFiles.map((file) => path.relative(process.cwd(), file)),
          fixtureOnlyCoreMapping: true,
          diagnostics,
        },
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
