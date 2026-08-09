# Official Opportunity Monitor — 8 August 2026

This record establishes the private weekly monitor for the live Summer 2027 recruiting sprint. It adds evidence capture and alerting; it does not authorize outreach, an application submission, artifact publication, or a public deployment.

## Operating commitment

- Schedule: every Monday at 8:00 AM in `America/New_York`; the schedule follows Eastern daylight-saving time. The run has a six-hour completion grace before health reporting calls it missed.
- Coverage: every run accounts for all seven registered first-party targets exactly once.
- Persistence: each scheduled run has one stable run key. An identical replay returns the existing immutable run; different evidence for the same key is rejected.
- Append-only history: the original Recruiting Opportunity remains unchanged. Only a materially changed later state creates an Opportunity Observation.
- Notification: notify for a newly discovered opportunity, a material change, a bounded source failure, or a decision the learner must make. A complete no-change run is preserved without an attention alert.
- External-action boundary: the monitor cannot send outreach, submit an application, claim work authorization, or publish a portfolio artifact.

## Official target registry

| Target | First-party source | Monitoring purpose | Verified state on 8 Aug 2026 |
|---|---|---|---|
| Bessemer Analyst Program | https://job-boards.greenhouse.io/bvpanalyst | Paid investment-team analyst openings | Summer Analyst 2027 was publicly listed and open. |
| Pear Fellows | https://pear.vc/programs/dorm/fellows/ | Investing Milestone availability and deadline | The public page showed an application link and a Sunday 9 Aug deadline. The year remained ambiguous and requires learner judgment before any submission. |
| Dorm Room Fund | https://join.dormroomfund.com/ | Regional application, deadline, eligibility, and workload | Applications were open; the public page described regional deadlines and a 10–15 hour weekly commitment. |
| Keyhorse Capital careers | https://www.keyhorse.vc/careers | Detect a new public opening | The careers collection showed no public item. |
| Contrary Venture Partner Program | https://applications.contrary.com/?program=Venture+Partner+Program | Investing Milestone availability and deadline | The dynamic application surface did not yield sufficient bounded text; preserve a parse failure rather than infer a state. |
| Insight Partners Summer Analyst Program | https://info.insightpartners.com/Summer-Analyst-Program.html | Closure or a future analyst cycle | The first-party page said it was no longer accepting 2027 Summer Investment Analyst applications. |
| Y Combinator careers | https://www.ycombinator.com/careers | Actual YC investment-team openings | The careers page described investment careers but exposed no verified opening in the reviewed content; portfolio-company jobs are not substitutes. |

Each registry entry has an allowlisted first-party host. A run cannot introduce an aggregator, a different host, raw page content, contact details, or confidential correspondence.

## Material evidence standard

The monitor compares these effective fields: status, opportunity class, funnel class, published deadline and timezone, compensation evidence, role scope and qualification, Immigration Evidence State and supporting evidence, location, work mode, next action, and due date. A check time or observation date changing by itself is not material.

New first-party opportunities become immutable Recruiting Opportunities. Identity combines the normalized first-party URL with a stable role-or-cycle key, so a new annual cycle on an unchanged program page cannot overwrite the prior cycle. Material changes within that identity become dated Opportunity Observations linked to the original. Failures remain bounded inside the Opportunity Monitor Run with one code and concise summary; they never fabricate an opportunity snapshot.

## Private endpoint and ownership

The authenticated learner registers the monitor once. Registration stores only a one-way fingerprint of the private automation credential and binds that credential to one owner. The monitor endpoint then resolves the owner from the registered bearer credential; it does not accept an owner identifier from the caller.

The endpoint validates the Monday schedule, full registry coverage, first-party hosts, evidence dates, bounded fields, whole-run size, and recruiting classifications before one atomic batch insert. Each run retains the complete validated check bundle—including check times, reachable snapshots, and bounded failures—plus the records and notification reasons it produced. It supports a read-only registry/current-state view plus append-only run submissions. Generic record or event endpoints cannot create or alter monitor records.

The development fallback credential exists only for local synthetic verification. Before the private phase checkpoint is deployed, the runtime must receive a distinct secret of at least 32 characters, the learner must register it through the private Recruiting workspace, and the live endpoint must pass the same replay and owner-boundary checks. No secret is stored in this record.

## First live run boundary

The Codex heartbeat reads this target registry and checks current first-party pages. If the private endpoint is not yet reachable because the Phase 1 private checkpoint has not been deployed, it must preserve a bounded failure/update in the local task and call for the checkpoint decision; it must not pretend that the canonical private endpoint received the run.
