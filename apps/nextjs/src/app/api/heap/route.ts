import { writeHeapSnapshot } from "v8";

export const GET = () => {
  writeHeapSnapshot("/app/nextjs.heapsnapshot");
  return new Response("Heap snapshot written");
};
