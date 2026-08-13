# Design daily delivery, persistence, and history

Type: research
Status: resolved
Parent: ../map.md
Blocked by: 05

## Question

What reliable mechanism should prepare the 7:00 AM Eastern Daily Brief, notify the learner, persist append-only dated history, handle missed days and unavailable links, and keep Sites synchronized with the canonical Private Learning Record?

## Comments

- 2026-08-13: The learner asked to keep building the site in parallel while the Dorm Room Fund application waits. Daily delivery's storage, scheduling, failure, export, and archive contracts are independent of visual acceptance, so the dependency on the claimed Sites prototype ticket was removed; the later operating release remains blocked on both decisions. Claimed this now-unblocked research ticket. No learner acceptance of Sites version 5 is inferred.

## Answer

Use the dated [Daily Delivery, Persistence, and History decision](../../../records/daily-delivery-persistence-and-history-2026-08-13.md) and its [platform primary-source note](../../../research/daily-delivery-platform-primary-sources-2026-08-13.md). The live Lab will accept at most one owner-scoped assignment outcome per learner date: a fully gated four-lane Brief, an explicit unavailable result, or a practice-mode displacement. Scheduler wakes are treated as at-least-once and possibly late; D1 uniqueness, server-computed evidence checksums, exact-replay acceptance, and conflicting-replay rejection provide logical idempotency.

The browser becomes read-and-respond only for assignment curation. D1 remains the operational source of truth, while learner responses, corrections, source failures, replacements, later usefulness, missed practice, archive reconciliation, and run completion append as typed evidence. A bounded owner-filtered export is JCS-canonicalized and SHA-256 hashed, then preserved without overwrite beneath the ignored repository-relative private archive. The operating release must still implement and test the three dedicated tables, automation and browser routes, dynamic UI, Coach round trip, five real weekday runs, runtime credential binding, archive reconciliation, migration, fixed-point reviews, and private deployment in ticket 15. Sites version 5 remains separately awaiting learner acceptance in ticket 13.
