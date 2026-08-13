# Venture Judgment Lab

A private, evidence-first practice environment for building venture judgment.
The site is the interactive learning surface; the dated records in this
workspace remain the durable source of truth.

## Working learning system

- **Daily Brief:** open four verified original sources, respond independently, and preserve one immutable Reading Record per source.
- **Sourcing mastery:** test one bounded discovery hypothesis, preserve exact company attribution and first signals, advance funnel stages only through dated evidence, and compare channels by linked Snapshots and Underwrites.
- **Snapshot Judgment:** commit a causal view, linked evidence, uncertainty, disposition, and confidence before deeper research.
- **Forecast:** lock a falsifiable claim, probability, resolution date, disconfirming condition, and resolution source.
- **Second-Order Map:** trace explicit first-, second-, and third-order consequences before stress-testing stakeholders, regulation, adjacent effects, and disconfirmation.
- **Weekly Underwrite:** test exactly three Load-Bearing Questions through a claim-linked Evidence Ledger, Founder Evidence, Countercase, and Decision Delta.
- **Founder Evidence Review:** examine one public or private evidence encounter across insight, speed, integrity, recruiting ability, adaptability, and founder-market fit while separating observation from inference and preserving gaps.
- **Practice modes:** preserve the accepted Normal, Monthly Calibration, Recruiting Surge, and Exam Mode arithmetic without hidden backlog.
- **Calibration Review:** resolve eligible Forecasts without changing their original odds, calculate a Brier score, diagnose sourcing and reasoning mistakes, and commit one changed decision rule.
- **History:** keep original submissions read-only and append later evidence, calibration, corrections, resolution, and coaching.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

`npm run dev` serves the hot-reloading app on `127.0.0.1` with the fixed
`local-learner` identity. For the fast everyday production build, run:

```bash
npm run local
```

Both commands keep D1 state in the git-ignored
`.private/venture-judgment-lab/local-db` directory. Put Luna and connected-source
credentials in `.env.local`; they are loaded into the server runtime and are
never exposed to browser code. The only supported local-server option is a
port override, for example `npm run local -- --port 3210`; the host remains
loopback-only.

Run the local release checks with:

```bash
npm run local:verify
```

The local database deliberately starts empty and is separate from the private
hosted Site. `npm run archive:sync` continues to preserve new local work in the
ignored Private Archive.

Use `npm test` for the production build and learning-surface integrity check.
With the local preview running, `node tests/api-smoke.mjs` verifies every
persisted workflow under an isolated verification identity. D1 persistence is
declared in `.openai/hosting.json` and initialized by the application.
