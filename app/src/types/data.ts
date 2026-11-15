
export type Body = 'moon' | 'mars';
export type Confidence = 'high' | 'medium' | 'low';

export interface Criterion {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  rule: string;
  pass: boolean | null;
  source: string;
  why?: string | null;
}

export interface Selection {
  goal: string;
  role: 'candidate' | 'validation';
  criteria: Criterion[];
  note: string;
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
  purpose: Purpose | null;
}

export interface Purpose {
  text: string;
  sources: string[];
}

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
  known: boolean;
  knownRef: string | null;
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
