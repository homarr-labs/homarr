import { createRscTrpcContext } from "./rsc-context";
import { downloadsRouter } from "./router/widgets/downloads";

export const getDownloadJobsAndStatusesAsync = async (input: {
  integrationIds: string[];
  limitPerIntegration: number;
}) => {
  // Keep this leaf caller narrow: the shared server caller imports the complete app router into every widget-prefetch build.
  const caller = downloadsRouter.createCaller(await createRscTrpcContext());
  return await caller.getJobsAndStatuses(input);
};
