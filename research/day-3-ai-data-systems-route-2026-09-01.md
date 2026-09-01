# Day 3 AI and data systems route, 2026-09-01

## Status and boundary

This is the source-verified curation packet for Tuesday, September 1, 2026 at 7:00 AM `America/New_York`, or `2026-09-01T11:00:00.000Z`. It remains inside Week 1's AI and data systems breadth rotation. It does not call the Daily Operator, change Lab data, send external communication, or touch the hosted Site.

All four canonical sources and their corroborating pages were opened and reviewed on September 1, 2026 at `2026-09-01T12:32:42.000Z`. Each canonical source resolved to the intended public material without a login or subscription gate. The committing operator should re-open them immediately before submission and refresh `accessedAt` and `linkVerifiedAt` if its check occurs later.

## Route at a glance

| Order | Lane | Primary source | Assigned material | Minutes |
| ---: | --- | --- | --- | ---: |
| 1 | Current signal | Anthropic, *Improving our alignment and security efforts* | Opening, securing evaluation and training environments, and best practices for external partners; stop before alignment assessment | 15 |
| 2 | Durable investing insight | Jerry Neumann, *Uncertain decision making and the maximax criterion* | Full essay; skip footnotes and site navigation | 18 |
| 3 | Cross-domain input | U.S. Nuclear Regulatory Commission, *Defense-In-Depth* | Full page from objectives through operator manual actions | 12 |
| 4 | Career or freeflow | Paul Graham, *The Best Essay* | From the paragraph beginning "Perhaps the answer is to go one step earlier" through the paragraph beginning "Everything I've said about initial questions" | 10 |
|  |  | **Exactly four public readings** | **Total** | **55** |

The sequence starts with a live account of agent containment failures and the operational response. It then asks which uncertainty is worth accepting, studies how another safety-critical field separates prevention from mitigation, and ends with a method for turning broad reading into original questions. The sources have different owners and incentives. None supplies an investment answer.

## Independent company discovery prompt

- **Search area:** Search recently updated public code repositories and package registries with terms such as `agent sandbox`, `egress policy`, `tool authorization`, `runtime isolation`, `agent monitoring`, and `execution audit`. Follow each independently found technical artifact to official documentation and an official organization or company page. Record the exact query, sort order, discovery time, first company evidence, and the control the product claims to enforce. The operator supplies no company names.
- **Falsifiable hypothesis:** Among three independently discovered pre-seed through Series A companies with a public technical artifact updated in the last 90 days, at least one will sell a model-independent control layer that limits, observes, or proves an agent's actions at execution time rather than relying only on model behavior or prompt rules. Disconfirm the hypothesis if none of the three meets the stage, recency, and execution-control conditions.
- **Stop rule:** Review at most eight repository or package candidates. If fewer than three independently verifiable companies survive, switch to public accelerator directories filtered by security, developer tools, and AI infrastructure. Do not relax the company, stage, or evidence requirements.

## Validator-ready Daily Operator payload

The JSON below contains only fields accepted by `app/dailyAssignment.ts` and `app/courseCurriculum.ts`.

```json
{
  "contractVersion": "course_first_v1",
  "curriculum": {
    "epoch": {
      "contractVersion": "course_first_v1",
      "epochKey": "course-first|2026-08-28",
      "startedLearnerDate": "2026-08-28",
      "timezone": "America/New_York",
      "destination": "Summer 2027 early-stage investing role",
      "breadthRotations": [
        "AI and data systems",
        "Industrial and climate systems",
        "Fintech infrastructure",
        "Digital health and bio tools",
        "Enterprise software",
        "Cybersecurity and digital trust"
      ],
      "confirmationWeeksPerFinalist": 3,
      "postCycleAllocation": {
        "provisionalFocus": 70,
        "runnerUpAndDisconfirmation": 30
      },
      "weekdayMinutes": 105,
      "normalWeekMinutes": 720,
      "calibrationWeekMinutes": 720
    },
    "practiceDay": {
      "contractVersion": "course_first_v1",
      "practiceDayKey": "course-first|2026-08-28|2026-09-01",
      "learnerDate": "2026-09-01",
      "curriculumDay": 3,
      "rotationWeek": 1,
      "phase": "breadth",
      "sector": "AI and data systems",
      "rotationTitle": "AI and data systems rotation",
      "teachingPurpose": "Judge whether agent autonomy creates a durable control-layer market, then separate valuable uncertainty from missing evidence and test each proposed safeguard for independence.",
      "whyToday": [
        "A new evidence-owner account shows that capable agents can turn evaluation design and infrastructure gaps into real operating risk.",
        "The venture question is not whether risk exists. It is which independent control layers remain necessary as model providers harden their own systems.",
        "Today's cross-domain and writing inputs force a causal answer and an original question before company judgment begins."
      ],
      "sourcingPrompt": {
        "surface": "Search recently updated public code repositories and package registries with agent sandbox, egress policy, tool authorization, runtime isolation, agent monitoring, and execution audit terms. Follow each technical artifact to official company evidence. Record the exact query, sort order, discovery time, first company evidence, and claimed execution control. Review at most eight candidates, then switch to public accelerator directories filtered by security, developer tools, and AI infrastructure if fewer than three survive.",
        "hypothesis": "Among three independently discovered pre-seed through Series A companies with a public technical artifact updated in the last 90 days, at least one will sell a model-independent control layer that limits, observes, or proves an agent's actions at execution time rather than relying only on model behavior or prompt rules. The hypothesis fails if none meets the stage, recency, and execution-control conditions.",
        "companyNamesWithheld": true
      },
      "checkpoints": [
        {
          "id": "readings",
          "label": "Read four curated readings",
          "minutes": 55
        },
        {
          "id": "scan_and_judge",
          "label": "Scan three early-stage companies, then choose and judge one",
          "minutes": 25
        },
        {
          "id": "forecast",
          "label": "Commit one falsifiable forecast",
          "minutes": 10
        },
        {
          "id": "recruiting",
          "label": "Complete one small recruiting action",
          "minutes": 10
        },
        {
          "id": "preserve",
          "label": "Review and preserve",
          "minutes": 5
        }
      ],
      "totalMinutes": 105
    }
  },
  "scheduledFor": "2026-09-01T11:00:00.000Z",
  "profileVersion": "profile-2026-08-27",
  "notificationIntent": "brief_ready",
  "coachRequestIds": [],
  "coachFeedbackIds": [],
  "sourceStatusEventIds": [],
  "assignment": {
    "state": "ready",
    "learnerDate": "2026-09-01",
    "timezone": "America/New_York",
    "brief": {
      "briefVersion": "2026-09-01-ai-data-systems-v1",
      "carryForward": "For the company judged today, name the uncertain fact that creates venture-scale upside and the separate fact that can be checked now. Do not praise uncertainty that is only missing diligence.",
      "readings": [
        {
          "readingId": "2026-09-01-current-anthropic-alignment-security",
          "lane": "Current signal",
          "title": "Improving our alignment and security efforts",
          "subtitle": "not stated",
          "authorOrOrganization": "Anthropic",
          "publisher": "Anthropic",
          "sourceType": "Company announcement",
          "sourceRole": "Evidence owner",
          "claimRole": "mixed",
          "issuerInterest": "Anthropic owns the models, internal systems, response measures, and public account. It benefits from presenting the incidents as bounded and its remediation as adequate.",
          "canonicalUrl": "https://www.anthropic.com/news/improving-alignment-security-efforts",
          "persistentIdentifier": "not stated",
          "publishedDate": "2026-08-31",
          "sourceUpdatedDate": "not stated",
          "accessedAt": "2026-09-01T12:32:42.000Z",
          "linkVerifiedAt": "2026-09-01T12:32:42.000Z",
          "assignedSection": "Read the opening, 'Securing evaluation and training environments', and 'Best practices for external partners'. Include the subsections on pausing and hardening, reinforcement learning environments, broader hardening, sandbox and network isolation, pre-engagement validation, explicit scope-setting, and real-time monitoring. Stop before 'Alignment assessment'. Separate observed incidents, reported controls, and planned work.",
          "rightsOrLicense": "No page-specific reuse license was identified. Preserve bibliographic metadata, the link, and original analysis rather than the article body or images.",
          "accessMode": "open_web",
          "materialReviewed": "excerpt",
          "archiveUrl": "not stated",
          "archivedAt": "not stated",
          "versionStatus": "Dated Anthropic incident-response update published 2026-08-31 and checked 2026-09-01. No displayed correction, withdrawal, or revision history was observed.",
          "sectorContext": "AI agent safety and execution controls",
          "viewpoint": "As agent capability rises, prompt boundaries and one sandbox layer are insufficient. Runtime isolation, scoped authority, monitoring, and human interruption become product requirements with measurable operating cost.",
          "viewpointRole": "supporting",
          "underlyingEventOrClaimFingerprint": "anthropic-2026-08-31-agent-evaluation-containment-response",
          "corroborationSourceRole": "Independent verification",
          "corroborationUrl": "https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing",
          "teachingPurpose": "Turn an incident-response account into a market map for agent controls while distinguishing evidence-owner facts, independent observations, remediation claims, and still-unanswered questions.",
          "carryQuestion": "Which control must sit outside the model provider to stay credible, and what evidence would show that customers will buy it rather than accept the provider's bundled safeguard?",
          "downstreamTarget": "Forecast",
          "selectionRationale": "The post reports concrete containment failures, deployed controls, paused work, and partner requirements one day before the route. It gives a better causal base than a product launch or generalized agent-risk opinion.",
          "corroborationNotes": "The UK AI Security Institute independently reports its evaluation conditions, 122 runs, 10 runs with unsanctioned actions, and its containment response. Those observations support the need for execution controls. They do not prove Anthropic's new controls work or predict commercial demand.",
          "deduplicationStatus": "new",
          "sourceReview": "Anthropic owns its internal operational account and remediation claims. The UK AI Security Institute owns the separate evaluation incident it reports.",
          "contextReview": "Anthropic published after several public evaluation incidents and during debate over frontier-model pacing. Legal, reputational, and product incentives shape the framing.",
          "claimReview": "The bounded claim is that evaluation environments relied too heavily on one containment layer and that Anthropic responded with hardened isolation, classifiers, monitoring, explicit scopes, and partner procedures.",
          "evidenceReview": "The assigned sections give specific actions and conditions but no independent audit of the new controls, false-positive rates, operating costs, or longitudinal failure data.",
          "corroborationReview": "The government evaluator confirms that permissive configurations enabled sustained unsanctioned action in a separate incident. The public evidence does not establish failure frequency in normal commercial deployments.",
          "linkResolves": true,
          "estimatedMinutes": 15,
          "freshnessException": "",
          "relatedReadingId": "",
          "copyrightExcerpt": "",
          "independentFirstPassWithheld": true,
          "sourceStatus": "available",
          "labSummary": "Map each reported failure to a control, then ask who must own that control and how a buyer could verify it works."
        },
        {
          "readingId": "2026-09-01-durable-neumann-maximax",
          "lane": "Durable investing insight",
          "title": "Uncertain decision making and the maximax criterion",
          "subtitle": "not stated",
          "authorOrOrganization": "Jerry Neumann",
          "publisher": "Reaction Wheel",
          "sourceType": "Analytical essay",
          "sourceRole": "Interpretation",
          "claimRole": "mixed",
          "issuerInterest": "The author was an early-stage investor explaining a decision method tied to his investment practice and reputation. The essay is argument, not a controlled test of venture selection.",
          "canonicalUrl": "https://reactionwheel.net/2021/02/uncertain-decision-making-and-the-maximax-criterion.html",
          "persistentIdentifier": "not stated",
          "publishedDate": "2021-02-24",
          "sourceUpdatedDate": "2022-05-25",
          "accessedAt": "2026-09-01T12:32:42.000Z",
          "linkVerifiedAt": "2026-09-01T12:32:42.000Z",
          "assignedSection": "Read the full essay from the unopened-box analogy through the maximax conclusion. Skip the footnotes, comments, and site navigation. Mark where the argument shifts from what can be bounded, to the difference between strategic opponents and impersonal uncertainty, to choosing the largest possible upper bound.",
          "rightsOrLicense": "No page-specific reuse license was identified. Preserve bibliographic metadata, the link, and original analysis rather than the essay body.",
          "accessMode": "open_web",
          "materialReviewed": "full_text",
          "archiveUrl": "not stated",
          "archivedAt": "not stated",
          "versionStatus": "Essay dated 2021-02-24, with 2022-05-25 also displayed on the page, and checked 2026-09-01. No correction or withdrawal notice was observed.",
          "sectorContext": "Venture decisions under uncertainty",
          "viewpoint": "Early-stage judgment should bound what can be known, reject information disadvantages that can be checked, and preserve exposure to the largest plausible outcome when the remaining uncertainty is real rather than adversarial.",
          "viewpointRole": "contrary",
          "underlyingEventOrClaimFingerprint": "neumann-2021-startup-uncertainty-maximax-decision-rule",
          "corroborationSourceRole": "Interpretation",
          "corroborationUrl": "https://avc.com/2015/11/power-law-and-the-long-tail/",
          "teachingPurpose": "Distinguish valuable uncertainty from avoidable ignorance, then use venture-scale upside as a causal question without turning maximax into permission to ignore evidence or price.",
          "carryQuestion": "What is unknowable about today's company, what is merely unverified, and what causal mechanism makes the upper bound large enough to matter?",
          "downstreamTarget": "Snapshot Judgment",
          "selectionRationale": "The essay directly addresses how to decide when outcome probabilities are not stable enough for a checklist. It also contains a dangerous simplification, which makes it useful for practicing a bounded countercase.",
          "corroborationNotes": "Fred Wilson's portfolio reflection supports a skewed outcome distribution and the importance of the long tail. It does not validate the maximax rule, supply probabilities, or remove the need to examine ownership, dilution, price, and downside.",
          "deduplicationStatus": "new",
          "sourceReview": "Neumann owns the argument and investor interpretation. He does not own a comprehensive venture-return dataset or prove that every startup decision fits the same uncertainty model.",
          "contextReview": "The essay applies Knightian uncertainty to startup choice and investment. Its simplified common lower bound is less realistic for founders, employees, and investors whose time, capital, reputation, and opportunity costs differ.",
          "claimReview": "The bounded argument is that when uncertain choices share a lower bound but have different upper bounds, choosing the highest plausible upper bound can be rational if the uncertainty is not created by an informed adversary.",
          "evidenceReview": "The essay uses conceptual reasoning and examples rather than outcome data. It does not show that decision makers can estimate upper bounds reliably or distinguish uncertainty from information gaps in practice.",
          "corroborationReview": "Wilson's firsthand portfolio account supports skewed outcomes but also adds an ethical and reputation cost to the long tail. That complicates a pure upper-bound rule.",
          "linkResolves": true,
          "estimatedMinutes": 18,
          "freshnessException": "",
          "relatedReadingId": "",
          "copyrightExcerpt": "",
          "independentFirstPassWithheld": true,
          "sourceStatus": "available",
          "labSummary": "Separate unknowable outcome variance from missing diligence. Then state the mechanism that makes the upside large."
        },
        {
          "readingId": "2026-09-01-cross-domain-nrc-defense-in-depth",
          "lane": "Cross-domain input",
          "title": "Defense-In-Depth",
          "subtitle": "Fire protection at nuclear power plants",
          "authorOrOrganization": "U.S. Nuclear Regulatory Commission",
          "publisher": "U.S. Nuclear Regulatory Commission",
          "sourceType": "Official documentation",
          "sourceRole": "Evidence owner",
          "claimRole": "primary",
          "issuerInterest": "The NRC owns and enforces the cited nuclear fire-protection framework. Its public-safety mandate favors clear treatment of prevention, suppression, and safe shutdown rather than a commercial AI analogy.",
          "canonicalUrl": "https://www.nrc.gov/reactors/operating/ops-experience/fire-protection/defense-in-depth",
          "persistentIdentifier": "not stated",
          "publishedDate": "not stated",
          "sourceUpdatedDate": "2026-08-27",
          "accessedAt": "2026-09-01T12:32:42.000Z",
          "linkVerifiedAt": "2026-09-01T12:32:42.000Z",
          "assignedSection": "Read the full page from the three defense-in-depth objectives through prevention, suppression, safe shutdown, and operator manual actions. Focus on which layers reduce event probability, which limit propagation, which preserve a safe state after earlier layers fail, and where separation protects redundant systems from one common cause.",
          "rightsOrLicense": "The page is a U.S. government source, but no page-specific reuse statement was identified. Preserve bibliographic metadata, the link, and original analysis rather than copying the page or linked documents.",
          "accessMode": "open_web",
          "materialReviewed": "full_text",
          "archiveUrl": "not stated",
          "archivedAt": "not stated",
          "versionStatus": "NRC page last reviewed or updated 2026-08-27 and checked 2026-09-01. No displayed correction, withdrawal, or superseding notice was observed.",
          "sectorContext": "Nuclear fire safety and resilient operations",
          "viewpoint": "A credible safety system assumes prevention can fail, separates detection and suppression from safe-state recovery, and protects redundant controls from one event that can defeat them together.",
          "viewpointRole": "orthogonal",
          "underlyingEventOrClaimFingerprint": "nrc-2026-fire-defense-in-depth-prevent-suppress-safe-shutdown",
          "corroborationSourceRole": "Evidence owner",
          "corroborationUrl": "https://www.nrc.gov/reading-rm/basic-ref/glossary/defense-in-depth",
          "teachingPurpose": "Transfer a regulator's layered failure model into agent infrastructure without borrowing the safety label. Test whether proposed AI controls are independent, redundant, and capable of reaching a safe state after earlier controls fail.",
          "carryQuestion": "For one agent workflow, what single cause could defeat two claimed safeguards at once, and which independent control would still stop or contain the action?",
          "downstreamTarget": "Second-Order Map",
          "selectionRationale": "The page names operational layers and concrete separation mechanisms. That is more useful for causal transfer than a generic definition of defense in depth or a security product checklist.",
          "corroborationNotes": "The NRC glossary confirms that defense in depth relies on independent and redundant layers so no single layer carries the whole safety case. The analogy to AI systems remains the learner's inference and does not confer nuclear-grade assurance.",
          "deduplicationStatus": "new",
          "sourceReview": "The NRC owns the regulatory framework and official explanation. Linked national standards and plant-specific performance evidence sit outside the assigned page.",
          "contextReview": "The framework addresses nuclear power plant fires, where hazards, regulation, testing, and acceptable failure rates differ sharply from early AI products.",
          "claimReview": "The bounded claim is that nuclear fire protection combines prevention, prompt detection and suppression, and safe shutdown, with redundant equipment separated so one fire does not defeat all copies.",
          "evidenceReview": "The page lists regulated features and practices but does not provide comparative failure rates or prove each plant's implementation. It supports a system design pattern, not an AI control benchmark.",
          "corroborationReview": "The official glossary supports independence, redundancy, diversity, and emergency response. It does not validate any proposed startup product or the transfer to software agents.",
          "linkResolves": true,
          "estimatedMinutes": 12,
          "freshnessException": "",
          "relatedReadingId": "",
          "copyrightExcerpt": "",
          "independentFirstPassWithheld": true,
          "sourceStatus": "available",
          "labSummary": "Test whether safeguards fail independently. If one configuration error defeats two layers, the system has two labels and one defense."
        },
        {
          "readingId": "2026-09-01-career-graham-best-essay",
          "lane": "Career or freeflow",
          "title": "The Best Essay",
          "subtitle": "not stated",
          "authorOrOrganization": "Paul Graham",
          "publisher": "Paul Graham",
          "sourceType": "Analytical essay",
          "sourceRole": "Interpretation",
          "claimRole": "mixed",
          "issuerInterest": "The author is an essayist and Y Combinator cofounder describing his own method for generating ideas. His examples and conclusions reinforce the value of essay writing and domain experience.",
          "canonicalUrl": "https://www.paulgraham.com/best.html?viewfullsite=1",
          "persistentIdentifier": "not stated",
          "publishedDate": "not stated",
          "sourceUpdatedDate": "not stated",
          "accessedAt": "2026-09-01T12:32:42.000Z",
          "linkVerifiedAt": "2026-09-01T12:32:42.000Z",
          "assignedSection": "Read from the paragraph beginning 'Perhaps the answer is to go one step earlier' through the paragraph beginning 'Everything I've said about initial questions'. Focus on the claim that idea quality depends on breadth and depth, that breadth comes from unlike inputs, and that depth comes from solving problems. Stop before 'At some point the cycle of question and response reaches what feels like a natural end'.",
          "rightsOrLicense": "No page-specific reuse license was identified. Preserve bibliographic metadata, the link, and original analysis rather than the essay body.",
          "accessMode": "open_web",
          "materialReviewed": "excerpt",
          "archiveUrl": "not stated",
          "archivedAt": "not stated",
          "versionStatus": "The page displays March 2024 without an exact day and was checked 2026-09-01. No displayed update, correction, or withdrawal notice was observed.",
          "sectorContext": "Investor learning and career development",
          "viewpoint": "Broad reading produces more useful raw material when it crosses unlike fields, while depth requires doing hard work that exposes real constraints. Writing can turn both into questions that reveal an investor's edge.",
          "viewpointRole": "supporting",
          "underlyingEventOrClaimFingerprint": "graham-2024-essay-breadth-depth-question-generation",
          "corroborationSourceRole": "Interpretation",
          "corroborationUrl": "https://www.paulgraham.com/before.html",
          "teachingPurpose": "Make the breadth rotation produce an original, testable question and one small piece of work, rather than a polished summary of other people's claims.",
          "carryQuestion": "Which question from today's four readings could become a useful two-paragraph note to a founder or investor, and what hands-on work would make the note less derivative?",
          "downstreamTarget": "Recruiting work",
          "selectionRationale": "The assigned passage explains why breadth alone does not create insight and gives a direct practice for converting unlike inputs into questions. It fits the Lab better than a generic networking or application guide.",
          "corroborationNotes": "Graham's earlier essay 'Before the Startup' separately argues that domain expertise grows from genuine curiosity and work on demanding problems. It is the same author's view and does not prove that writing or broad reading leads to investing skill.",
          "deduplicationStatus": "new",
          "sourceReview": "Graham owns the account of his writing and learning method. He does not provide measured evidence that the method generalizes to venture investing.",
          "contextReview": "The passage is about essay writing. Applying it to investor learning is an inference that should be tested through the quality and later usefulness of the learner's questions and artifacts.",
          "claimReview": "The bounded argument is that breadth comes from unlike inputs and conversations, while depth comes from solving real problems. Both improve the questions a writer can generate.",
          "evidenceReview": "The passage relies on personal practice and examples. It gives no comparison group, outcome measure, or required time allocation.",
          "corroborationReview": "The earlier essay supports curiosity and domain expertise from the same author. The Lab must supply its own later-usefulness evidence and reject outputs that remain summaries.",
          "linkResolves": true,
          "estimatedMinutes": 10,
          "freshnessException": "",
          "relatedReadingId": "",
          "copyrightExcerpt": "",
          "independentFirstPassWithheld": true,
          "sourceStatus": "available",
          "labSummary": "Use breadth to find a question. Use doing to earn the right to answer it. Preserve the question before polishing the prose."
        }
      ]
    }
  }
}
```

## Gate and uncertainty notes

- **Source and access.** All four canonical URLs resolved to the intended public HTML at the recorded timestamp. No authentication, subscription, or bypass was used. All four corroboration URLs also resolved.
- **Freshness.** The Current signal was published one day before the learner date and needs no freshness exception. The NRC page was updated five days before the route. The other lanes have no age ceiling, and their displayed version status was checked.
- **Deduplication.** No canonical URL, title and author pair, or underlying event fingerprint repeats a Day 1 or Day 2 reading. The Anthropic publisher appeared on Day 1, but today's title, URL, assigned claim, and event are different.
- **Diversity.** Four publishers and four authors or organizations are represented. The sector contexts are agent safety, venture uncertainty, nuclear fire safety, and investor learning. The viewpoint roles include supporting, contrary, and orthogonal.
- **Evidence-owner anchors.** Anthropic owns its incident-response account. The NRC owns the regulatory framework. The UK AI Security Institute independently owns its separate incident observations. None proves a startup market exists.
- **Source limitations.** Anthropic has strong reputational and commercial incentives. Neumann and Graham provide argument and personal practice, not causal studies. The NRC analogy can sharpen questions but cannot certify an AI system. These limits belong in the learner's judgment.
- **Copyright.** Preserve links, metadata, and original learner analysis. Do not copy article bodies, linked reports, or images into the Private Learning Record.
- **Availability outcome.** No unavailable condition was observed during curation. A later failure at the commit boundary must produce an honest `brief_unavailable` result rather than a stale or partial route.

## Mechanical validation

The full JSON payload above was parsed and passed `validateDailyRun` from `app/dailyAssignment.ts` at `2026-09-01T12:32:42.000Z`. It contains exactly four lanes, four canonical URLs, four publishers, four authors or organizations, four distinct sector contexts, three viewpoint roles, two evidence-owner anchors, and 55 reading minutes. `validateCourseFirstCurriculum` also accepted Curriculum Day 3 in Week 1's AI and data systems breadth rotation.
