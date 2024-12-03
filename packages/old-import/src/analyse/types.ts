import type { Modify } from "@homarr/common/types";
import type { AnalyseResult } from "./analyse-oldmarr-import";
import type { OldmarrConfig } from "@homarr/old-schema";

export type AnalyseConfig = AnalyseResult["configs"][number];
export type ValidAnalyseConfig = Modify<AnalyseConfig, { config: OldmarrConfig }>;