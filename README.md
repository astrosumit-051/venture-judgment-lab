# Venture Judgment Lab

A private, evidence-first practice environment for building venture judgment.
The site is the interactive learning surface; the dated records in this
workspace remain the durable source of truth.

## Current learning loop

- **Daily Brief:** orient across four evidence lanes without turning reading into busywork.
- **Snapshot Judgment:** commit an independent view before coaching or deeper analysis.
- **Weekly Underwrite:** test a locked Snapshot against evidence, countercase, and Decision Delta.
- **History:** preserve original submissions and append later reflections without rewriting them.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Use `npm test` for the production build and learning-surface integrity check. D1 persistence
is declared in `.openai/hosting.json` and initialized by the application.
