# Rejected widget candidates

The final application retains the baseline Coolify counts and cluster aggregate code. These inert source files and the old fixture preserve the measured candidates, not active application code.

Coolify caching reduced count-map builds but produced mixed CPU/elapsed results and added hooks plus retained maps. The cluster rewrite reduced visits but slowed the 100-node fixture. The evidence did not justify keeping either candidate under the simplicity and performance goals.

[manifest.json](manifest.json) maps the exact candidate bytes, fixture and raw-result SHA256s to the original production paths. [selected-timed-cases.json](selected-timed-cases.json) retains all nine candidate before/after cases. Final comparisons of unchanged production source appear in ../../results/widget_render.json; timing variation there is not an improvement.

For a replay, use a separate checkout, restore candidate source to the paths in the manifest and restore the archived fixture to cases/widget_render.mts. Follow the benchmark README setup, then select --case WIDGETS_B_006,WIDGETS_B_008. Do not overlay candidates into the final PR checkout.
