# Build the Conversational AI Teacher

Type: task
Status: resolved
Parent: ../map.md

## Question

Implement, validate, and privately release the learner-approved conversational entry layer across the Venture Judgment Lab while preserving every existing workflow, the Independent First Pass, append-only evidence, exact server validation, and approval boundaries.

## Comments

- 2026-08-13: Claimed for implementation after the learner approved the decision-complete conversational teacher plan. Existing Pear and DSO worktree changes are unrelated and must remain untouched.
- 2026-08-13: Released privately as Sites version 6 after the build, 62 tests, type check, existing API smoke, conversational API smoke, desktop review, and mobile review passed. Production AI calls remain safely disabled until the learner supplies the selected provider's server-only base URL, API key, and model identifier.

## Answer

Conversational entry is now the default across all 18 retained workflows. The
Teacher asks one question at a time, preserves the full visible transcript,
builds a bounded structured draft, supports natural-language corrections and
advanced editing, and requires explicit **Confirm and preserve** approval
before delegating to the existing immutable record validators. Today, Brief,
Sourcing, Recruiting, Snapshot, Forecast, Founder Evidence, Underwrite,
Diligence, Calibration, Practice, Coaching, and History remain available as
progress and review surfaces; manual forms remain as an advanced escape hatch.

The owner-only release is live at
https://venture-judgment-lab.sahsumit4545.chatgpt.site. The cloud provider is a
deployment setting, not a hard-coded product decision; the safe setup state
remains active until `LAB_AI_BASE_URL`, `LAB_AI_API_KEY`, and `LAB_AI_MODEL` are
stored as private server settings.
