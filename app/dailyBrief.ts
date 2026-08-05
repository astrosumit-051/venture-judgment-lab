export type DailyReading = {
  readingId: string;
  lane: "Current signal" | "Durable investing insight" | "Cross-domain input" | "Career or freeflow";
  title: string;
  subtitle: string;
  authorOrOrganization: string;
  publisher: string;
  sourceType: string;
  sourceRole: string;
  claimRole: "primary" | "secondary" | "mixed";
  issuerInterest: string;
  canonicalUrl: string;
  persistentIdentifier: string;
  publishedDate: string;
  sourceUpdatedDate: string;
  accessedAt: string;
  estimatedMinutes: number;
  assignedSection: string;
  rightsOrLicense: string;
  accessMode: string;
  materialReviewed: "full_text" | "excerpt" | "abstract" | "metadata_only";
  archiveUrl: string;
  sourceStatus: string;
  teachingPurpose: string;
  carryQuestion: string;
  downstreamTarget: string;
  selectionRationale: string;
  corroborationNotes: string;
  versionStatus: string;
  labSummary: string;
};

export const dailyBrief: {
  briefId: string;
  version: string;
  assignedDate: string;
  timezone: string;
  totalMinutes: number;
  readings: DailyReading[];
} = {
  briefId: "vjl-db-20260805-01",
  version: "2026-08-05-final-1",
  assignedDate: "2026-08-05",
  timezone: "America/Chicago",
  totalMinutes: 51,
  readings: [
    {
      readingId: "2026-08-05-current-signal-a7f2",
      lane: "Current signal",
      title: "Job Openings and Labor Turnover — June 2026",
      subtitle: "USDL-26-1289",
      authorOrOrganization: "U.S. Bureau of Labor Statistics",
      publisher: "U.S. Bureau of Labor Statistics",
      sourceType: "official economic statistical release",
      sourceRole: "Evidence owner",
      claimRole: "primary",
      issuerInterest: "The agency produces and revises the estimates and has no commercial stake in a particular labor-market interpretation.",
      canonicalUrl: "https://www.bls.gov/news.release/jolts.nr0.htm",
      persistentIdentifier: "USDL-26-1289",
      publishedDate: "2026-08-04",
      sourceUpdatedDate: "2026-08-04",
      accessedAt: "2026-08-05T16:06:20Z",
      estimatedMinutes: 9,
      assignedSection: "Release summary through the May 2026 revisions, then Table A totals and the Information, Finance and insurance, and Professional and business services rows.",
      rightsOrLicense: "BLS publications are generally public domain except specifically identified third-party material; attribution required.",
      accessMode: "free public web page",
      materialReviewed: "excerpt",
      archiveUrl: "not recorded at assignment",
      sourceStatus: "available",
      teachingPurpose: "Develop the capability to distinguish labor-demand stocks from hiring and quitting flows so a stable openings headline does not become a false claim that recruiting conditions are strong.",
      carryQuestion: "If openings are broadly stable while hires and quits remain subdued, what labor-market friction—not just demand—should change your view of startup hiring and your own recruiting strategy?",
      downstreamTarget: "Forecast",
      selectionRationale: "The evidence owner's release is better than a news summary because it exposes definitions, industry detail, preliminary status, and revisions.",
      corroborationNotes: "AP and Axios independently reported the release; BLS controls for definitions and revisions. Preserve the release identifier because the canonical URL is mutable.",
      versionStatus: "June 2026 preliminary estimates; later releases may revise them",
      labSummary: "Read openings as a stock and hires and separations as flows. Look for divergence rather than compressing all three measurements into one story about the job market.",
    },
    {
      readingId: "2026-08-05-durable-investing-c4b9",
      lane: "Durable investing insight",
      title: "Beginners' Guide to Financial Statements",
      subtitle: "not stated",
      authorOrOrganization: "Office of Investor Education and Advocacy",
      publisher: "U.S. Securities and Exchange Commission",
      sourceType: "official investor-education guide",
      sourceRole: "Evidence owner",
      claimRole: "primary",
      issuerInterest: "The agency has an investor-education mandate and states that the page is educational, not a legal interpretation or policy statement.",
      canonicalUrl: "https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements",
      persistentIdentifier: "not stated",
      publishedDate: "2014-01-12",
      sourceUpdatedDate: "2017-02-06",
      accessedAt: "2026-08-05T16:06:20Z",
      estimatedMinutes: 16,
      assignedSection: "Full page.",
      rightsOrLicense: "SEC.gov information may generally be copied with attribution; seals, logos, artwork, and third-party material are excluded.",
      accessMode: "free public web page",
      materialReviewed: "full_text",
      archiveUrl: "not recorded at assignment",
      sourceStatus: "available",
      teachingPurpose: "Develop the capability to connect the balance sheet, income statement, cash flow statement, shareholders' equity, footnotes, and MD&A instead of treating revenue or profit as a complete company story.",
      carryQuestion: "Which statement would expose the biggest contradiction between a startup's growth narrative and its economic reality, and what would you look for there?",
      downstreamTarget: "Weekly Underwrite",
      selectionRationale: "This integrated official guide is better than a one-term glossary because it shows how the statements relate and directs attention to footnotes, accounting judgments, and management discussion.",
      corroborationNotes: "A company Underwrite must still test claims against that company's actual filings or supplied records.",
      versionStatus: "Page last reviewed or updated 2017-02-06; no later edition disclosed",
      labSummary: "Treat the statements as one connected model of a business. Contradictions between them can reveal more than a strong headline number.",
    },
    {
      readingId: "2026-08-05-cross-domain-f1d6",
      lane: "Cross-domain input",
      title: "Leading Practices: Agile Portfolio Management and Iterative Business Cases Drive Innovative Product Development",
      subtitle: "GAO-25-107130",
      authorOrOrganization: "U.S. Government Accountability Office",
      publisher: "U.S. Government Accountability Office",
      sourceType: "government audit and research report",
      sourceRole: "Independent verification",
      claimRole: "mixed",
      issuerInterest: "GAO has no commercial stake but has an institutional interest in applying the identified practices to federal acquisition.",
      canonicalUrl: "https://www.gao.gov/products/gao-25-107130",
      persistentIdentifier: "GAO-25-107130",
      publishedDate: "2025-09-17",
      sourceUpdatedDate: "not stated",
      accessedAt: "2026-08-05T16:06:20Z",
      estimatedMinutes: 14,
      assignedSection: "Highlights pages ii–iv and report pages 1–5 in the linked accessible PDF; stop before the leading-companies section on report page 6.",
      rightsOrLicense: "GAO products are generally not protected by U.S. copyright; separately copyrighted material and endorsement restrictions still apply.",
      accessMode: "free public landing page and accessible PDF",
      materialReviewed: "excerpt",
      archiveUrl: "not recorded at assignment",
      sourceStatus: "available",
      teachingPurpose: "Develop the capability to transfer staged commitment and evidence-triggered portfolio review from complex product development into venture follow-on decisions.",
      carryQuestion: "What evidence milestone should cause an investor to increase, hold, or stop funding—and which milestone only creates the appearance of progress?",
      downstreamTarget: "Second-Order Map",
      selectionRationale: "The report is better than a generic venture portfolio post because it discloses how evidence was gathered and contrasts fixed business cases with iterative commitment across operating environments.",
      corroborationNotes: "The report synthesizes selected-company practice rather than estimating a representative industry effect; use it to generate an analogy to test.",
      versionStatus: "GAO-25-107130; no correction, withdrawal, or superseding version disclosed",
      labSummary: "Focus on decision architecture: begin with small commitments, review recurring evidence, and scale only after validation. Then identify where the venture-financing analogy breaks.",
    },
    {
      readingId: "2026-08-05-career-freeflow-e8a3",
      lane: "Career or freeflow",
      title: "How to Get Startup Ideas",
      subtitle: "not stated",
      authorOrOrganization: "Paul Graham",
      publisher: "Paul Graham",
      sourceType: "first-person founder and investor essay",
      sourceRole: "Interpretation",
      claimRole: "mixed",
      issuerInterest: "Material affiliation with the startup and Y Combinator ecosystem, including a founder-selection and company-formation lens.",
      canonicalUrl: "https://paulgraham.com/startupideas.html",
      persistentIdentifier: "not stated",
      publishedDate: "2012-11; day not stated",
      sourceUpdatedDate: "not stated",
      accessedAt: "2026-08-05T16:06:20Z",
      estimatedMinutes: 12,
      assignedSection: "Read the Noticing and School sections; stop before Competition.",
      rightsOrLicense: "not stated",
      accessMode: "free public web page",
      materialReviewed: "excerpt",
      archiveUrl: "not recorded at assignment",
      sourceStatus: "available",
      teachingPurpose: "Develop the capability to turn a college student's cross-disciplinary curiosity into a repeatable practice of noticing real problems rather than inventing plausible startup stories.",
      carryQuestion: "What recurring annoyance at the intersection of economics, data science, and campus life might be a real unmet need—and what observation would falsify it?",
      downstreamTarget: "Reflection",
      selectionRationale: "The essay is better than a list of startup ideas because it teaches a behavior—notice problems from lived experience—that can compound through college and sharpen later founder evaluation.",
      corroborationNotes: "The essay is a useful practice hypothesis, not representative evidence that the method guarantees strong companies; test any resulting idea through direct observation.",
      versionStatus: "Web essay dated 2012-11; no revision history or license disclosed",
      labSummary: "Treat the advice as a hypothesis about attention and lived experience. Preserve one observed problem and name evidence that would show it is merely an annoyance.",
    },
  ],
};
