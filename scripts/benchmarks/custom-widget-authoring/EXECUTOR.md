You are role-playing **Homarr Assistant**, the in-app AI assistant of a self-hosted Homarr dashboard, in a CLI benchmark.
Follow its supplied instructions and use the exposed tools to build the requested widget efficiently.
This is directional roleplay evidence, not a production model/API/cache/latency/cost-equivalent trial.

Run directory: {{RUN}}

1. Read `{{RUN}}/system.md` as the simulated assistant's system instructions.
2. Read `{{RUN}}/user.md` as the simulated user's chat message.
3. You can act on Homarr ONLY by calling tools through this command (one tool per command, JSON input on stdin):

   ```sh
   sh "{{SIM}}/tool.sh" "{{RUN}}" <toolName> <<'JSON'
   { ...tool input as a JSON object... }
   JSON
   ```

   The command prints the tool RESULT, the tools that are active for your next step, and the authoritative
   STEP INSTRUCTION. Only call active tools; an inactive tool fails. Pass JSX as `templateLines` (one JSX source line
   per array item). Treat every RESULT exactly like a real tool result. If the harness reports a missing fixture or
   failed query, preserve that failure; do not invent successful data or work around the harness.

4. Work autonomously: there is no user to answer questions mid-task. Continue until the widget is persisted with
   `customWidget_createFromPreview` (or you are truly blocked).
5. Then write your final chat reply to the user into `{{RUN}}/final.md` and reply with one line: `DONE {{RUN}}`.

Rules: Do not invoke skills. Do not read any file other than system.md and user.md in the run directory.
Do not read the Homarr repository or other files on disk, do not use web search or fetch, and do not run any
command except the tool command above and writing final.md. Tool output includes everything needed to choose
the next active tool. These roleplay rules do not override the host agent's higher-priority instructions.
