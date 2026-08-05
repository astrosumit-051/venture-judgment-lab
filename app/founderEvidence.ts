export const FOUNDER_DIMENSIONS = [
  {
    key: "insight",
    label: "Insight",
    prompt: "Does the founder reveal a specific, earned understanding of the problem, customer, or system?",
  },
  {
    key: "speed",
    label: "Speed",
    prompt: "What concrete evidence shows fast learning, execution, or decision-making without reckless shortcuts?",
  },
  {
    key: "integrity",
    label: "Integrity",
    prompt: "How does the founder handle bad news, uncertainty, incentives, attribution, or commitments?",
  },
  {
    key: "recruiting",
    label: "Recruiting ability",
    prompt: "What behavior shows an ability—or inability—to attract and retain unusually capable people?",
  },
  {
    key: "adaptability",
    label: "Adaptability",
    prompt: "What changed after contradictory evidence, and was the update fast, honest, and proportionate?",
  },
  {
    key: "founder_market_fit",
    label: "Founder-market fit",
    prompt: "What earned access, lived experience, technical depth, or durable motivation fits this specific market?",
  },
] as const;

export const FOUNDER_SOURCE_TYPES = [
  "Public interview",
  "Direct conversation",
  "Reference conversation",
  "Customer or employee observation",
] as const;

export type FounderDimensionKey = typeof FOUNDER_DIMENSIONS[number]["key"];
export type FounderSourceType = typeof FOUNDER_SOURCE_TYPES[number];
export type FounderEvidenceDirection = "supports" | "weakens" | "gap";

export type FounderDimensionObservation = {
  dimension: FounderDimensionKey;
  direction: FounderEvidenceDirection;
  observation: string;
  inference: string;
};

export function emptyFounderDimensions(): FounderDimensionObservation[] {
  return FOUNDER_DIMENSIONS.map((dimension) => ({
    dimension: dimension.key,
    direction: "gap",
    observation: "",
    inference: "",
  }));
}
