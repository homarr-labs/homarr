# Rejected Wazuh clock candidate

This archive preserves the source measured for A3 in the interrupted combined run. The final application keeps its original per-row clocks. The prototype reduced timers and renders, but increased label calculations and did not demonstrate a net CPU or elapsed-time benefit sufficient to justify a new external store. The mounted fixture includes setup, hydration, updates and cleanup; it does not prove a steady-state dashboard regression.

`frame.tsx.source.txt` and `use-row-time.ts.source.txt` are exact measured production candidates. `notebook_timers.mts.source.txt` preserves the corresponding fixture. They are inert text, excluded from the application and benchmark registration. `measured-A3.json` retains the prototype measurements; final-source A3 results are in `../../results/notebook_timers.json`.

For a replay, use a separate checkout, copy the two source files to their original Wazuh/common paths and copy the fixture to `scripts/benchmarks/performance-audit/cases/notebook_timers.mts`. Follow the benchmark README setup and select `--case A3`. Do not overlay the candidate into the final PR checkout. File/case hashes in the original result identify the measured revision.
