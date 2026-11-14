import { assertCompleteRegistry, executableProfiles } from "./profiles";
import { aggregateReport, finalizeReport, writeReport } from "./report";

assertCompleteRegistry();
switch (process.argv[2]) {
  case "matrix":
    console.log(JSON.stringify({ include: executableProfiles.map((profile) => ({ profile: profile.id })) }));
    break;
  case "initialize":
    await writeReport([]);
    break;
  case "finalize":
    await finalizeReport();
    break;
  case "aggregate":
    await aggregateReport();
    break;
  default:
    throw new Error("Expected matrix, initialize, finalize or aggregate");
}
