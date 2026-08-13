# Make the Luna Teacher intuitive

Type: task
Status: resolved
Parent: ../map.md

## Question

Configure the private Conversational Teacher for OpenAI GPT-5.6 Luna, without
storing a secret in source, and make the default learner flow intuitive without
removing any workflow, validator, transcript, or advanced-entry capability.

## Comments

- 2026-08-13: Claimed after the learner selected GPT-5.6 Luna and asked for a more intuitive experience. Luna is the model identifier; the separately issued OpenAI API key remains a private hosted secret.
- 2026-08-13: Privately released after the build, 62 tests, type check, unchanged API smoke, and conversational round trip passed. The hosted base URL and Luna model are active; the separate API key remains the learner's private configuration step.

## Answer

GPT-5.6 Luna is now the production model setting. The Teacher begins with four
plain-language learner goals, reveals only the relevant workflows, explains the
selected activity before starting, and shows Talk, Review, and Preserve as the
complete path. Active conversations support rough notes and plain-language
corrections, collapse older transcript turns without hiding them, and present a
friendlier record review without internal operation fields. All 18 workflows,
advanced entry, validators, transcript preservation, and explicit immutable
confirmation remain intact.

The owner-only release is live at
https://venture-judgment-lab.sahsumit4545.chatgpt.site. The OpenAI API key is
not a ChatGPT subscription credential and is not stored in source; it must be
added separately as the private `LAB_AI_API_KEY` hosted setting.
