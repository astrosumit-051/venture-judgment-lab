# Official Opportunity Monitor run, 14 September 2026

Scheduled slot: `2026-09-14T12:00:00.000Z`, Monday at 8:00 AM America/New_York  
Bounded check time: `2026-09-14T14:05:04.385Z`  
Canonical run key: `opportunity-monitor|2026-09-14`  
Persistence state: local evidence only. There is still no evidence that the private endpoint and owner-bound production registration are available, so this record does not claim D1 acceptance.

## Complete registered coverage

All seven registered first-party targets were checked once on their allowlisted hosts. No alternate source, raw page body, contact detail, credential, confidential material, outreach, or submission was preserved.

| Target | Outcome | Stable identity | Bounded result | Comparison |
|---|---|---|---|---|
| Bessemer Analyst Program | Reachable | `summer-analyst-2027`; `full-time-analyst-2027` | The official board still lists the Summer Analyst 2027 and Full Time Analyst 2027 roles in New York. | No material change from 31 August. |
| Pear Fellows | Reachable | `pear-fellows-2026-2027` | The page still has application links and states that the 2026-2027 cohort deadline was Sunday, August 9. | No new material change. The existing closed-versus-reverify learner decision remains open. |
| Dorm Room Fund | Reachable | `investment-partner-2026-2027` | The application remains presented as open. The page still gives September 17 at 11:59 PM ET for Philly and Southeast, New York and Midwest, and Boston and Northeast; October 1 at 11:59 PM PT for the West Coast; 10 to 15 hours each week; current-student eligibility; and the remote-partner rule. | No material change. |
| Keyhorse Capital careers | Failure: `unreachable` | `careers-no-public-opening` | The registered careers URL returned HTTP 404 in this check. | **New bounded source failure.** The prior reachable state is preserved. No opening or closure was inferred. |
| Contrary Venture Partner Program | Failure: `parse_failure` | `venture-partner-program-cycle-unknown` | The dynamic application page returned no bounded program text. | Existing failure, no fabricated snapshot. |
| Insight Partners Summer Analyst Program | Reachable | `summer-investment-analyst-2027` | The page still says that 2027 Summer Investment Analyst applications are no longer accepted. | No material change. |
| Y Combinator careers | Reachable | `investment-team-opening-none-verified` | The careers page was reachable, but the bounded result did not verify a YC investment-team opening. Portfolio-company roles were excluded. | No material change. |

## Attention condition

Keyhorse's registered careers page changed from reachable with no listed roles to HTTP 404. This is source availability evidence, not evidence that a role opened or closed. The monitor should recheck the same registered URL next week.

The production endpoint and owner registration boundary is unchanged. This complete run remains local and is not represented as accepted by D1. Pear's earlier learner decision and Contrary's earlier parse failure also remain unresolved, but neither is new this week.

No outreach, application submission, publication, authorization claim, or other external recruiting action occurred.
