// Types for the files the pipeline writes into app/public/data.
// Keep in sync with docs/DATA_CONTRACT.md and pipeline/schema.py.

export type Body = 'moon' | 'mars';
export type Confidence = 'high' | 'medium' | 'low';

/** One landing/base criterion checked for a site, e.g. elevation ≤ -1 km. */
export interface Criterion {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  rule: string;
  pass: boolean | null;
  source: string;
  /** Past landings only: why a rule the site fails did not matter for that mission. */
  why?: string | null;
}

/**
 * Why a site is on the list. Candidates are sites we found; past landings
 * are run through the same criteria to validate them ("validation").
 */
export interface Selection {
  goal: string;
  role: 'candidate' | 'validation';
  criteria: Criterion[];
  note: string;
  /** Past landings only: the limits the mission's own team set, checked with our data. */
  missionRules?: Criterion[];
}

export interface Site {
  id: string;
  body: Body;
  name: string;
  mission: string;
  agency: string;
  year: number | null;
  status: 'past' | 'candidate';
  lat: number;
  lon: number;
  summary: string;
  processes: string[];
  limits: string[];
  image: string | null;
  selection: Selection;
  /** Candidates: why a mission would go there. Past landings: why the mission went there. With sources; null until written. */
  purpose: Purpose | null;
}

export interface Purpose {
  text: string;
  sources: string[];
}

/** Past landings shown on the globes as name-only markers (no card, no fly-to). */
export interface Landing {
  name: string;
  body: Body;
  agency: string;
  year: number;
  lat: number;
  lon: number;
}

export interface LandingsFile {
  version: number;
  landings: Landing[];
}

export interface SitesFile {
  version: number;
  mock: boolean;
  sites: Site[];
}

export interface Dimension {
  id: string;
  label: string;
  bodies: Body[];
  description: string;
}

export interface DimensionScore {
  score: number | null;
  confidence: Confidence;
  note: string;
}

export interface Test {
  title: string;
  detail: string;
}

export interface Analog {
  id: string;
  siteId: string;
  rank: number;
  name: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
  /** true = a published analog site, or a spot in the same named region as one (see knownName). */
  known: boolean;
  knownRef: string | null;
  /** The published analog it is, or the one whose region it lies in with the distance. null for new places. */
  knownName?: string | null;
  totalScore: number;
  scores: Record<string, DimensionScore>;
  similarities: string[];
  differences: string[];
  tests: Test[];
  processes: string[];
  image: string | null;
  sources: string[];
}

export interface AnalogsFile {
  version: number;
  mock: boolean;
  dimensions: Dimension[];
  analogs: Analog[];
}
