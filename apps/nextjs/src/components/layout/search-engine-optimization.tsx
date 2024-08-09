import dynamic from "next/dynamic";

export const SearchEngineOptimization = dynamic(() => import("./search-engine-optimization-no-srr"), {
  ssr: false,
});
