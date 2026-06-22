export interface PitonisoLabMatch {
  home: string;
  away: string;
  kickoff?: string;
}

export interface PitonisoLabSignals {
  crowd?: string;
  form?: string;
  table?: string;
  ranking?: string;
  drawSignal?: string;
  contradictions?: string[];
}

export interface PitonisoLabInput {
  match: PitonisoLabMatch;
  signals: PitonisoLabSignals;
}

export type PitonisoLabRiskLabel = "bajo" | "medio" | "alto";

export interface PitonisoLabPreviewResult {
  headline: string;
  summary: string;
  risk_label: PitonisoLabRiskLabel;
  bullets: string[];
  disclaimer: string;
}

export interface PitonisoLabPreviewResponse {
  ok: true;
  provider: "ollama_local";
  model: string;
  headline: string;
  summary: string;
  risk_label: PitonisoLabRiskLabel;
  bullets: string[];
  disclaimer: string;
}
