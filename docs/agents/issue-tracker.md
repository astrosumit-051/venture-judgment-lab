# Issue tracker: Local Markdown

Issues and learning-system decisions for this project live as Markdown files in `.scratch/`. The Venture Judgment Lab site presents the experience dynamically; it does not replace this permanent record.

## Conventions

- One effort per directory: `.scratch/<effort-slug>/`
- The Wayfinder map is `.scratch/<effort-slug>/map.md`
- Child tickets are `.scratch/<effort-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- A `Type:` line records `research`, `prototype`, `grilling`, or `task`
- A `Status:` line records the workflow state
- Comments and conversation history append under `## Comments`
- Dated learner artifacts must preserve the original submission; corrections and hindsight are appended rather than silently rewriting history

## When a skill says "publish to the issue tracker"

Create a new Markdown file under `.scratch/<effort-slug>/`, creating the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the referenced file. The user will normally provide its path, title, or issue number.

## Wayfinding operations

- **Map:** `.scratch/<effort>/map.md` holds the destination, notes, decision pointers, fog, and out-of-scope boundary.
- **Child ticket:** `.scratch/<effort>/issues/<NN>-<slug>.md` contains one decision or investigation question.
- **Blocking:** `Blocked by: NN, NN` near the top. A ticket is unblocked when every listed ticket is resolved.
- **Frontier:** Open, unblocked, unclaimed child tickets; the lowest number wins.
- **Claim:** Set `Status: claimed` before doing any work.
- **Resolve:** Append the answer under `## Answer`, set `Status: resolved`, and add a linked one-line gist to the map's `Decisions so far` section.
