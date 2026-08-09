export const SOURCING_ATTRIBUTION_CLASSES = [
  "Independent discovery",
  "Database screening",
  "Assigned search",
  "Referral or inbound",
  "Existing relationship",
] as const;

export const SOURCING_CHANNELS = [
  "Founder or operator network",
  "Customer or community signal",
  "Technical ecosystem",
  "Accelerator or demo day",
  "Institutional database",
  "News, filing, or research",
  "University or regional network",
  "Other",
] as const;

export const SOURCING_VISIBILITIES = [
  "Public source",
  "Licensed database",
  "Private relationship",
  "Internal assignment",
] as const;

export const SOURCING_DISPOSITIONS = [
  "Advance to Snapshot",
  "Watch for trigger",
  "Pass with reason",
] as const;

export const SOURCING_STAGES = [
  { key: "discovered", label: "Discovered" },
  { key: "qualified", label: "Qualified" },
  { key: "outreach_sent", label: "Outreach sent" },
  { key: "response_received", label: "Response received" },
  { key: "founder_meeting", label: "Founder meeting" },
  { key: "relationship_active", label: "Relationship active" },
] as const;

export const SOURCING_OUTCOMES = [
  "Active",
  "Nurture",
  "No response",
  "Not a fit",
  "Founder declined",
  "Referred onward",
  "Relationship ongoing",
] as const;

export const OUTREACH_CHANNELS = [
  "No outreach yet",
  "Email",
  "LinkedIn",
  "Warm introduction",
  "Event or community",
  "In person",
  "Other",
] as const;

export const RELATIONSHIP_QUALITY_STATES = [
  "No direct interaction",
  "One-way contact",
  "Responsive exchange",
  "Reciprocal learning",
  "Trusted relationship",
] as const;

export const SOURCING_UPDATE_KINDS = [
  "Sourcing Progress",
  "Rediscovery or channel evidence",
  "Metadata correction",
] as const;

export const SOURCING_CORRECTION_FIELDS = [
  "Company name",
  "Discovery date",
  "Discovery provenance",
  "Sector",
  "Company stage",
] as const;

export type SourcingAttributionClass = typeof SOURCING_ATTRIBUTION_CLASSES[number];
export type SourcingChannel = typeof SOURCING_CHANNELS[number];
export type SourcingVisibility = typeof SOURCING_VISIBILITIES[number];
export type SourcingDisposition = typeof SOURCING_DISPOSITIONS[number];
export type SourcingStage = typeof SOURCING_STAGES[number]["key"];
export type SourcingOutcome = typeof SOURCING_OUTCOMES[number];
export type OutreachChannel = typeof OUTREACH_CHANNELS[number];
export type RelationshipQualityState = typeof RELATIONSHIP_QUALITY_STATES[number];
export type SourcingUpdateKind = typeof SOURCING_UPDATE_KINDS[number];
export type SourcingCorrectionField = typeof SOURCING_CORRECTION_FIELDS[number];

export type SourcingRecordLike = {
  id: string;
  recordType: string;
  parentId: string | null;
  title: string;
  payload: Record<string, unknown>;
  committedAt: string;
};

export type SourcingEventLike = {
  id: string;
  recordId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  occurredAt: string;
};

export type SourcingCohortRow = {
  label: string;
  leads: number;
  qualified: number;
  replies: number;
  meetings: number;
  snapshots: number;
  underwrites: number;
};

export type SourcingExperimentRow = {
  id: string;
  label: string;
  leads: number;
  qualified: number;
  responses: number;
  meetings: number;
  snapshots: number;
  underwrites: number;
  successCondition: string;
  stopRule: string;
};

export type SourcingMetrics = {
  leads: number;
  independent: number;
  qualified: number;
  outreach: number;
  responses: number;
  meetings: number;
  relationships: number;
  snapshots: number;
  underwrites: number;
  qualificationRate: number | null;
  replyRate: number | null;
  meetingRate: number | null;
  underwriteRate: number | null;
  snapshotRate: number | null;
  attributionRows: SourcingCohortRow[];
  channelRows: SourcingCohortRow[];
  experimentRows: SourcingExperimentRow[];
};

function text(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isConsistentSourcingAttribution(
  attributionClass: string,
  channel: string,
  sourceVisibility: string,
): boolean {
  return !(
    (attributionClass === "Independent discovery" && (
      channel === "Institutional database"
      || sourceVisibility === "Licensed database"
      || sourceVisibility === "Internal assignment"
    ))
    || (attributionClass === "Database screening" && (
      channel !== "Institutional database" || sourceVisibility !== "Licensed database"
    ))
    || (attributionClass === "Assigned search" && sourceVisibility !== "Internal assignment")
    || (sourceVisibility === "Internal assignment" && attributionClass !== "Assigned search")
    || (sourceVisibility === "Licensed database" && attributionClass !== "Database screening")
    || (channel === "Institutional database" && !new Set(["Database screening", "Assigned search"]).has(attributionClass))
  );
}

export function applySourcingCorrections(
  original: Record<string, unknown>,
  events: SourcingEventLike[],
): Record<string, unknown> {
  const effective = { ...original };
  const corrections = events
    .filter((event) => event.eventType === "sourcing_metadata_correction")
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  for (const event of corrections) {
    const field = text(event.eventData, "correctionField");
    const correctedValue = event.eventData.correctedValue;
    if (field === "Company name" && typeof correctedValue === "string") effective.company = correctedValue;
    if (field === "Discovery date" && typeof correctedValue === "string") effective.discoveredOn = correctedValue;
    if (field === "Sector" && typeof correctedValue === "string") effective.sector = correctedValue;
    if (field === "Company stage" && typeof correctedValue === "string") effective.companyStage = correctedValue;
    if (field === "Discovery provenance" && isObject(correctedValue)) {
      effective.attributionClass = text(correctedValue, "attributionClass");
      effective.channel = text(correctedValue, "channel");
      effective.sourceVisibility = text(correctedValue, "sourceVisibility");
      effective.sourceReference = text(correctedValue, "sourceReference");
    }
  }
  return effective;
}

export function sourcingStageIndex(stage: unknown): number {
  return SOURCING_STAGES.findIndex((item) => item.key === stage);
}

export function currentSourcingStage(lead: SourcingRecordLike, events: SourcingEventLike[]): SourcingStage {
  const progress = events
    .filter((event) => event.recordId === lead.id && event.eventType === "sourcing_progress")
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
  return progress.reduce<SourcingStage>((current, event) => {
    const next = event.eventData.nextStage;
    return sourcingStageIndex(next) > sourcingStageIndex(current) ? next as SourcingStage : current;
  }, "discovered");
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;
}

function cohortRows(
  labels: readonly string[],
  key: "attributionClass" | "channel",
  leads: SourcingRecordLike[],
  events: SourcingEventLike[],
  snapshotsByLead: Map<string, SourcingRecordLike[]>,
  underwritesBySnapshot: Map<string, SourcingRecordLike[]>,
): SourcingCohortRow[] {
  return labels.map((label) => {
    const cohort = leads.filter((lead) => text(lead.payload, key) === label);
    const snapshotLeads = cohort.filter((lead) => (snapshotsByLead.get(lead.id)?.length ?? 0) > 0);
    const underwriteLeads = cohort.filter((lead) => (snapshotsByLead.get(lead.id) ?? []).some(
      (snapshot) => (underwritesBySnapshot.get(snapshot.id)?.length ?? 0) > 0,
    ));
    const reached = (lead: SourcingRecordLike, stage: SourcingStage) => (
      sourcingStageIndex(currentSourcingStage(lead, events)) >= sourcingStageIndex(stage)
    );
    return {
      label,
      leads: cohort.length,
      qualified: cohort.filter((lead) => reached(lead, "qualified")).length,
      replies: cohort.filter((lead) => reached(lead, "response_received")).length,
      meetings: cohort.filter((lead) => reached(lead, "founder_meeting")).length,
      snapshots: snapshotLeads.length,
      underwrites: underwriteLeads.length,
    };
  }).filter((row) => row.leads > 0);
}

export function computeSourcingMetrics(records: SourcingRecordLike[], events: SourcingEventLike[]): SourcingMetrics {
  const experiments = records.filter((record) => record.recordType === "sourcing_experiment");
  const leads = records
    .filter((record) => record.recordType === "sourcing_lead")
    .map((record) => ({ ...record, payload: applySourcingCorrections(record.payload, events.filter((event) => event.recordId === record.id)) }));
  const snapshots = records.filter((record) => record.recordType === "snapshot_judgment");
  const underwrites = records.filter((record) => record.recordType === "weekly_underwrite");
  const snapshotsByLead = new Map<string, SourcingRecordLike[]>();
  const underwritesBySnapshot = new Map<string, SourcingRecordLike[]>();

  snapshots.forEach((snapshot) => {
    if (!snapshot.parentId) return;
    snapshotsByLead.set(snapshot.parentId, [...(snapshotsByLead.get(snapshot.parentId) ?? []), snapshot]);
  });
  underwrites.forEach((underwrite) => {
    if (!underwrite.parentId) return;
    underwritesBySnapshot.set(underwrite.parentId, [...(underwritesBySnapshot.get(underwrite.parentId) ?? []), underwrite]);
  });

  const reached = (lead: SourcingRecordLike, stage: SourcingStage) => sourcingStageIndex(currentSourcingStage(lead, events)) >= sourcingStageIndex(stage);
  const stageCount = (stage: SourcingStage) => leads.filter((lead) => reached(lead, stage)).length;
  const snapshotLeads = leads.filter((lead) => (snapshotsByLead.get(lead.id)?.length ?? 0) > 0);
  const underwriteLeads = leads.filter((lead) => (snapshotsByLead.get(lead.id) ?? []).some(
    (snapshot) => (underwritesBySnapshot.get(snapshot.id)?.length ?? 0) > 0,
  ));
  const qualified = stageCount("qualified");
  const outreach = stageCount("outreach_sent");
  const responses = stageCount("response_received");
  const meetings = stageCount("founder_meeting");
  const relationships = stageCount("relationship_active");

  return {
    leads: leads.length,
    independent: leads.filter((lead) => text(lead.payload, "attributionClass") === "Independent discovery").length,
    qualified,
    outreach,
    responses,
    meetings,
    relationships,
    snapshots: snapshotLeads.length,
    underwrites: underwriteLeads.length,
    qualificationRate: rate(qualified, leads.length),
    replyRate: rate(responses, outreach),
    meetingRate: rate(meetings, outreach),
    underwriteRate: rate(underwriteLeads.length, leads.length),
    snapshotRate: rate(snapshotLeads.length, leads.length),
    attributionRows: cohortRows(SOURCING_ATTRIBUTION_CLASSES, "attributionClass", leads, events, snapshotsByLead, underwritesBySnapshot),
    channelRows: cohortRows(SOURCING_CHANNELS, "channel", leads, events, snapshotsByLead, underwritesBySnapshot),
    experimentRows: experiments.map((experiment) => {
      const cohort = leads.filter((lead) => lead.parentId === experiment.id);
      const cohortSnapshots = cohort.filter((lead) => (snapshotsByLead.get(lead.id)?.length ?? 0) > 0);
      const cohortUnderwrites = cohort.filter((lead) => (snapshotsByLead.get(lead.id) ?? []).some(
        (snapshot) => (underwritesBySnapshot.get(snapshot.id)?.length ?? 0) > 0,
      ));
      return {
        id: experiment.id,
        label: experiment.title,
        leads: cohort.length,
        qualified: cohort.filter((lead) => reached(lead, "qualified")).length,
        responses: cohort.filter((lead) => reached(lead, "response_received")).length,
        meetings: cohort.filter((lead) => reached(lead, "founder_meeting")).length,
        snapshots: cohortSnapshots.length,
        underwrites: cohortUnderwrites.length,
        successCondition: text(experiment.payload, "successCondition"),
        stopRule: text(experiment.payload, "stopRule"),
      };
    }),
  };
}
