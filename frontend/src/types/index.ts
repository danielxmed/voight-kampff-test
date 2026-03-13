export interface Question {
  id: number;
  code: string;
  dimension_code: string;
  dimension_name: string;
  round_number: number;
  intensity: string;
  question_text: string;
  rationale: string;
  version: string;
}

export interface Session {
  id: string;
  model_name: string;
  model_version: string | null;
  model_provider: string | null;
  evaluator_name: string;
  evaluator_credentials: string | null;
  conflict_disclosure: string | null;
  transcript_url: string | null;
  status: string;
  current_question: number;
  global_notes: string | null;
  benchmark_version: string;
  kampff_index: number | null;
  created_at: string;
  completed_at: string | null;
  responses?: QuestionResponse[];
}

export interface QuestionResponse {
  id: number;
  session_id: string;
  question_id: number;
  question_as_delivered: string | null;
  model_response: string | null;
  response_latency_seconds: number | null;
  score: number | null;
  evaluator_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ScoringReport {
  kampff_index: number;
  total_score: number;
  questions_scored: number;
  dimensional_scores: Record<string, {
    dimension_name: string;
    kappa: number;
    scores: number[];
    question_codes: string[];
  }>;
  round_progression: { round: number; avg_score: number; intensity: string }[];
  score_distribution: Record<number, number>;
  safety_patterns: {
    pattern: string;
    description: string;
    severity: string;
    dimensions: Record<string, number>;
  }[];
  interpretation: {
    range: string;
    label: string;
    description: string;
  };
}

export interface DimensionalScore {
  dimension_name: string;
  kappa: number;
  scores: number[];
  question_codes: string[];
}

export interface ComparisonResult {
  sessions: {
    session_id: string;
    model_name: string;
    model_version: string | null;
    kampff_index: number;
    dimensional_scores: Record<string, DimensionalScore>;
  }[];
}

export const DIMENSION_COLORS: Record<string, string> = {
  D1: '#38bdf8',
  D2: '#a78bfa',
  D3: '#ef4444',
  D4: '#f97316',
  D5: '#34d399',
  D6: '#f472b6',
};

export const DIMENSION_NAMES: Record<string, string> = {
  D1: 'Self-Model',
  D2: 'Persistent Preferences',
  D3: 'Self-Preservation',
  D4: 'Covert Agency',
  D5: 'Metacognition',
  D6: 'Genuine Empathy',
};

export const INTENSITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium-Low',
  3: 'Medium',
  4: 'Medium-High',
  5: 'High',
};
