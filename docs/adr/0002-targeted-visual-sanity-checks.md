---
status: accepted
---

# Targeted visual and behavior sanity checks

Require sanity evidence for affected features before release, with explicit maintainer exceptions. Running every widget and workflow on every change would impose unnecessary cost; select relevant checks, seed unrelated prerequisites such as authentication and fixture data, and parallelize independent cases with isolated state. Start with board containers and editing workflows, then extend the fixture catalog.

Select representative scenarios through a checked-in file/dependency mapping; agents may add checks, while unmapped changes require an explicit coverage decision. Before publication, run the selected scenarios against the already-built release image, covering changes since the last validated release. This avoids both a second image build and treating separate PR evidence as proof of the combined release.

Target at most 60 seconds for a warm local check and 3 minutes for selected CI checks after the app/image is ready. Measure and report startup/build time separately; the budget does not authorize silently dropping checks.

An independent agent may accept explained appearance changes. Changing a behavior guarantee existing users rely on requires a maintainer decision; the implementing agent cannot approve its own replacement baseline. Chrome on Linux is the initial browser environment. Use the compare-first developer workbench at `/debug/board/sanity`, extending the isolated snapshot playground. Recorded images belong to their pinned builds; optional snapshot replay uses the current renderer and remains read-only. See the [contribution workflow](../agents/board-sanity.md).
