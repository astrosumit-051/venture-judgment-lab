# Daily Brief Curation and Reading Record Standard — 2026-08-05

## Decision

Every weekday Daily Brief contains four deliberately different readings within a combined 55-minute cap. A reading qualifies because it serves a named teaching purpose and passes source, access, freshness, duplication, and preservation gates—not because it is popular, prestigious, or convenient.

The Reading Record is append-only. It preserves what was assigned, why, what the learner thought at the time, and what later happened to the source or its usefulness. Metadata corrections, dead links, retractions, and hindsight are appended as dated events rather than silently changing history.

## Daily Brief contract

| Lane | Purpose | Normal freshness | Typical time |
| --- | --- | --- | ---: |
| **Current signal** | Expose a recent company, market, technical, regulatory, or behavioral change that can feed today's Snapshot Judgment or Forecast. | Published or materially updated within 7 days. Up to 30 days only with a recorded reason. | 8–12 min |
| **Durable investing insight** | Develop a lasting mental model through a primary document, investor memo, market history, research paper, or rigorous analytical essay. | No age limit; the current version and correction status must be checked. | 15–20 min |
| **Cross-domain input** | Force analogy and Second-Order thinking beyond the current sector through science, policy, history, operations, culture, or another industry. | No age limit when durable; within 30 days when selected as a live signal. | 10–15 min |
| **Career or freeflow** | Develop writing, relationships, professional judgment, intellectual curiosity, biography-based learning, or recruiting readiness. | No age limit. | 8–15 min |

The estimates must total no more than 55 minutes. Use a publisher's reading estimate when credible; otherwise estimate text conservatively at roughly 200 words per minute and use actual runtime for audio or video.

If a high-value work exceeds 25 minutes, serialize it across dated Daily Briefs. Each continuation links to the first Reading Record and states the section assigned that day. Serialization does not permit the total Brief to exceed 55 minutes.

## Source-quality gate

Before selection, the Judgment Coach answers four questions adapted from the Library of Congress information-literacy framework: who is behind the information, what context produced it, what claims and evidence it contains, and what other sources say. The framework explicitly emphasizes source, contextualization, close reading, and corroboration. [Library of Congress information-literacy guidance](https://www.loc.gov/static/programs/teachers/professional-development/webinar/documents/Information%20Literacy_2020PDF.pdf)

Every candidate receives a **source role**, not a simplistic prestige grade:

1. **Evidence owner:** filing, dataset, law or regulation, official documentation, source code, research output, earnings material, company announcement, or a direct statement by a relevant principal.
2. **Independent verification:** reputable reporting, institutional research, or analysis that checks claims against multiple sources.
3. **Interpretation:** investor, founder, operator, historian, or specialist reasoning whose argument is itself the object of study.
4. **Discovery lead:** social post, aggregator, newsletter pointer, or search result used to locate evidence but normally insufficient as the final reading.

Also record `claim_role` as `primary`, `secondary`, or `mixed` relative to the specific claim being studied, plus `issuer_interest` when the source has a material stake in the claim. A company announcement is primary evidence that the announcement occurred; it is not independent proof that every promotional claim is true.

Selection rules:

- At least two of the four daily readings must be anchored in evidence-owner material or explicitly link and distinguish the primary evidence they interpret.
- A material factual claim in a current signal must be checked against the evidence owner or independent corroboration before assignment.
- Social posts and aggregators may be assigned only when the post itself is primary evidence—for example, a founder's dated announcement—and its scope is labeled accurately.
- AI-generated material is never a normal core reading. It may be assigned only when AI-generated output is itself the object of analysis and its provenance is explicit.
- A familiar brand, famous author, impressive credential, or confident tone never substitutes for evidence.
- For scholarly work, check the DOI or publisher page for corrections, retractions, withdrawals, or later versions. Crossref's Crossmark exists specifically to expose changes that affect interpretation or credit. [Crossref Crossmark](https://www.crossref.org/services/crossmark/)

## Teaching-purpose gate

Every selected reading must include:

- a one-sentence **teaching purpose** beginning with the capability or misconception it is intended to develop;
- one **carry question** the learner should hold while reading;
- a named downstream target: Snapshot Judgment, Forecast, Second-Order Map, Weekly Underwrite, Sector Discovery evidence, recruiting work, or reflection; and
- the reason this reading is better for that purpose than the most obvious alternative.

Reject selections justified only as “important,” “interesting,” “popular,” or “good to know.” A Daily Brief is an instructional sequence, not a news feed.

The Judgment Coach withholds its interpretation until the learner has recorded an Independent First Pass. Any coach-generated summary is labeled as commentary and never presented as a substitute for the source.

## Balance and diversity

- Use all four lanes every Daily Brief; one article cannot fill two lanes.
- During a Breadth Rotation, no more than two daily selections should stay inside the active sector. Cross-domain and career/freeflow lanes preserve breadth.
- Use no more than one selection from the same publisher in a single Brief.
- Across a rolling five-Brief week, use no more than three selections from one publisher or two from one author unless the record contains a specific curriculum reason.
- Include at least one meaningful disconfirming or contrary source each week.
- Do not let US venture commentary crowd out technical documents, customer evidence, regulation, history, international markets, or operator knowledge.
- Diversity means different evidence and incentives, not merely different URLs repeating the same claim.

## Freshness and version rules

- Record the source's original publication date and every disclosed update date separately. Do not replace the original date with the newest date; Crossref likewise recommends preserving relevant date types rather than supplying only the latest publication date. [Crossref bibliographic metadata guidance](https://www.crossref.org/documentation/principles-practices/best-practices/bibliographic/)
- Copy a source date only when the source explicitly states it. Otherwise record `not stated`; never substitute a footer copyright year, search-result timestamp, DOI-registration timestamp, or archive-capture time.
- Record the assignment date and access timestamp independently from source dates.
- A Current Signal older than 7 days requires a `freshness_exception` explaining why it is newly decision-relevant. No Current Signal may be older than 30 days.
- Durable, cross-domain, and career/freeflow works have no age ceiling, but the selected edition or version must be identifiable.
- A later correction, retraction, withdrawal, or substantive update becomes a dated Reading Record event; it never overwrites the version the learner originally read.

## Deduplication and revisits

Check candidates against normalized canonical URL, DOI or other persistent identifier, title-and-author fingerprint, and the underlying event or claim.

- Do not assign the exact work twice by accident.
- A deliberate continuation of a long work is marked `continuation` and links the first record.
- A deliberate reread is marked `revisit`, links the original record, and states what changed: new evidence, a later version, a Calibration Review, or a different question.
- Within seven days, do not assign multiple readings about the same event unless the later item adds primary evidence, a substantive correction, or a genuinely contrary interpretation.
- A different headline or syndicated URL does not make an item new.
- Never fill a lane with a near-duplicate merely to reach four readings.

## Access and copyright rules

The four core readings must be lawfully accessible to the learner in the environment where the Brief will be used.

- Never bypass a paywall, authentication requirement, technical protection, or publisher access control.
- A subscription item may count only when the learner has legitimate access; record the access mode and provide a lawful accessible alternative when continuity would otherwise depend on the subscription.
- Record the material actually reviewed as `full_text`, `excerpt`, `abstract`, or `metadata_only`. An inaccessible source cannot be marked read or summarized beyond the material the learner actually saw.
- Store bibliographic metadata, links, original learner notes, and the Lab's brief teaching-purpose summary—not article bodies, screenshots, figures, or downloaded PDFs.
- One short attributed excerpt of at most 25 words may be stored when necessary to identify the claim. This is a conservative Lab rule, not a declaration that a fixed word count guarantees fair use. The U.S. Copyright Office states that fair use depends on the circumstances and provides no universally safe number of words or percentage. [U.S. Copyright Office fair-use FAQ](https://www.copyright.gov/help/faq/faq-fairuse.html)
- Public-domain or openly licensed material may be retained only under its actual terms. When using Creative Commons Attribution material, give credit, link the license, and indicate changes. [Creative Commons BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/deed.en)
- Do not upload private, authenticated, paywalled, confidential, or token-bearing URLs to a public archive.

## Reading Record

### Immutable assignment record

Create one record per assigned lane with:

- `reading_id` — stable ID derived from assignment date, lane, and a non-semantic unique suffix;
- `assigned_date` and `assigned_timezone`;
- `lane`;
- original `title`, `subtitle`, `author_or_organization`, and `publisher`;
- `source_role` and `source_type`;
- claim-relative `claim_role` (`primary`, `secondary`, or `mixed`) and `issuer_interest` when material;
- `canonical_url`, plus DOI or another persistent identifier when available;
- `published_date`, `source_updated_date`, and `accessed_at` as separate fields;
- `estimated_minutes` and, for a continuation, the assigned section;
- exact `rights_or_license` and version when disclosed, otherwise `not stated`;
- `access_mode` and `material_reviewed` (`full_text`, `excerpt`, `abstract`, or `metadata_only`);
- `archive_url` and `archived_at` when a lawful snapshot exists;
- `sector_cycle`, `company`, or other relevant context links;
- `teaching_purpose`, `carry_question`, `downstream_target`, and `selection_rationale`;
- corroboration or version-status notes; and
- the exact Daily Brief in which it appeared.

Crossref recommends complete, accurate contributor, title, date, and identifier metadata because omissions impair citation and discovery. [Crossref bibliographic metadata guidance](https://www.crossref.org/documentation/principles-practices/best-practices/bibliographic/)

### Append-only events

Later activity is stored as dated events linked to the immutable assignment:

- `learner_response` — Independent First Pass, takeaway, uncertainty, and submitted timestamp;
- `artifact_link` — Snapshot Judgment, Forecast, Underwrite, or other work that used the reading;
- `metadata_correction` — corrected metadata, evidence, date, and actor without deleting the original value;
- `source_status` — available, moved, paywalled, unavailable, corrected, retracted, withdrawn, or superseded;
- `replacement_link` — lawful replacement or new canonical location while preserving the original URL;
- `revisit` or `continuation`;
- `later_usefulness` — dated outcome and explanation; and
- `coach_feedback` — critique appended only after the Independent First Pass.

Later usefulness uses four evidence states:

| State | Meaning |
| --- | --- |
| 0 — no demonstrated use | No later artifact or decision used the reading. |
| 1 — contextual use | It improved vocabulary, context, or a later question. |
| 2 — material use | It changed or materially supported a Snapshot Judgment, Forecast, Underwrite, or recruiting decision. |
| 3 — durable use | Later evidence showed that the reading continued to improve judgment or exposed a recurring mistake. |

`misleading`, `superseded`, and `unresolved` are separate flags so a persuasive but wrong source does not receive a high usefulness state merely because it influenced the learner.

## Link preservation and failure handling

- Verify that the link resolves to the intended work immediately before assignment.
- Prefer a DOI URL for registered research because DOI names are designed to remain independent of changing locations, while retaining the publisher landing URL as metadata. [DOI Foundation handbook](https://www.doi.org/doi-handbook/html/)
- A DOI is an identity and location aid, not a trust badge or a promise of current, peer-reviewed, or openly accessible full text.
- For a mutable, freely accessible public webpage, store a Wayback Machine snapshot when permitted. Save Page Now provides a persistent URL but may fail when a site blocks crawling or has incompatible security settings. [Internet Archive Save Page Now guidance](https://archivesupport.zendesk.com/hc/en-us/articles/360001513491-Save-Pages-in-the-Wayback-Machine)
- If external archiving would expose a sensitive research trail, preserve local metadata only in the Private Learning Record.
- Archive failure does not erase or automatically disqualify a legitimate reading; record the failure and retain complete metadata.
- Never replace an original URL in place. Append the new canonical URL, DOI, archive URL, or lawful substitute with the date discovered.
- If a link fails after assignment, preserve the learner response and all linked artifacts. Mark the source unavailable, then append a replacement when one exists.
- If the source is corrected or retracted, show that status prominently wherever the Reading Record appears and revisit affected learner work during Calibration Review.

## Pre-publication gate

A Daily Brief is ready only when all answers are yes:

1. Are all four lanes present and distinct?
2. Do estimated reading times total 55 minutes or less?
3. Does every link resolve to the intended version with lawful learner access?
4. Are author or organization, publisher, publication date, access time, and identifiers complete or explicitly marked unknown?
5. Does each selection pass source, context, claim, evidence, and corroboration review?
6. Are current signals within the freshness rule or accompanied by a valid exception?
7. Do publisher, author, sector, and viewpoint diversity rules pass?
8. Are duplicates, continuations, and revisits identified correctly?
9. Does every selection contain a teaching purpose, carry question, downstream target, and comparative selection rationale?
10. Is copyrighted content limited to metadata, original notes, a short Lab summary, and at most one necessary short excerpt?
11. Will the learner's Independent First Pass precede coach interpretation?
12. Has the immutable assignment record been written before delivery?

If any gate fails, replace or repair the selection before delivery. Never silently lower quality to fill a lane. If a source becomes unavailable after delivery and no lawful replacement exists, record the failure and continue the Lab without fabricating or copying the missing content.

## Implications for the later site and delivery design

- Sites must render the Daily Brief from immutable assignment records and append-only events rather than mutable cards.
- The archive must expose original and update dates, source status, continuations, revisits, replacements, and linked learner artifacts.
- Search and deduplication must work across canonical URL, DOI, author, title, event, company, and teaching purpose.
- Delivery must complete the pre-publication gate before the learner receives the 7:00 AM notification.
- The Private Learning Record remains canonical even when a link, publisher, or site integration fails.
