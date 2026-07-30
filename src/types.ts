export type PersonaId = 'novice' | 'expert' | 'skeptic' | 'emotional';

export type DimensionType = 
  | 'assumed_knowledge' 
  | 'clarity' 
  | 'emotional_calibration' 
  | 'logical_coherence' 
  | 'originality';

export type EmotionType = 
  | 'curious' 
  | 'engaged' 
  | 'bored' 
  | 'confused' 
  | 'surprised' 
  | 'moved' 
  | 'tense' 
  | 'flat';

export interface PersonaFeedback {
  id: PersonaId;
  score: number; // 1 to 5
  confidence: number; // 0.0 to 1.0
  note: string; // max 20 words
  emotion?: EmotionType;
}

export interface SectionResult {
  id: number;
  excerpt: string;
  dimensions: DimensionType[];
  importance: number; // 1 to 5
  personas: PersonaFeedback[];
}

export interface OverallSummary {
  novice: string;
  expert: string;
  skeptic: string;
  emotional: string;
}

export interface EvaluationResult {
  sections: SectionResult[];
  overall_summary: OverallSummary;
}

export interface PresetSample {
  id: string;
  title: string;
  category: 'Story Opening' | 'Pitch' | 'Lyric' | 'Tagline';
  text: string;
  description: string;
}

export interface PersonaInfo {
  id: PersonaId;
  name: string;
  role: string;
  heuristic: string;
  /** Primary brand color hex used for styling (e.g. score bars, labels) */
  color: string;
  iconName: string;
}
