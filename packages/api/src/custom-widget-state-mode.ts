export function useProcessLocalCustomWidgetState(runtime: { CI?: string; NODE_ENV?: string } = process.env): boolean {
  if (runtime.NODE_ENV === "production") return false;
  return runtime.NODE_ENV === "test" || runtime.CI === "true";
}
