import express from 'express';
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from '@ibm-cloud/watsonx-ai/authentication';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import type { EvaluationResult, PersonaFeedback, PersonaId, SectionResult, DimensionType, EmotionType } from './types.js';

dotenv.config({ quiet: true });

export const app = express();

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    return res.status(400).json({ error: 'Request payload could not be read. Please try again.' });
  }
  next(error);
});

// Rate-limit the AI evaluation endpoint to prevent API quota abuse and unexpected billing.
// 20 requests per minute per IP is generous for interactive use.
const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  message: { error: 'Too many evaluation requests. Please wait a moment before trying again.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Lazy initializer — replaceable in tests via setAiClient()
let aiClient: WatsonXAI | null = null;

export function setAiClient(client: WatsonXAI | null): void {
  aiClient = client;
}

export function getWatsonxClient(): WatsonXAI {
  if (!aiClient) {
    const apiKey = process.env.WATSONX_API_KEY;
    const serviceUrl = process.env.WATSONX_SERVICE_URL ?? 'https://us-south.ml.cloud.ibm.com';
    if (!apiKey) {
      throw new Error('WATSONX_API_KEY environment variable is not configured.');
    }
    aiClient = WatsonXAI.newInstance({
      serviceUrl,
      authenticator: new IamAuthenticator({ apikey: apiKey }),
    });
  }
  return aiClient;
}

const VALID_PERSONA_IDS: readonly PersonaId[] = ['novice', 'expert', 'skeptic', 'emotional'];
const VALID_DIMENSIONS: readonly DimensionType[] = [
  'assumed_knowledge',
  'clarity',
  'emotional_calibration',
  'logical_coherence',
  'originality',
];
const VALID_EMOTIONS: readonly EmotionType[] = [
  'curious',
  'engaged',
  'bored',
  'confused',
  'surprised',
  'moved',
  'tense',
  'flat',
];

interface WatsonxTextChatResponse {
  result?: {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
}

type TextChatClient = Pick<WatsonXAI, 'textChat'>;

// ── JSON schema passed to guidedJSON for structured output ────────────────────
// This is a plain JSON Schema string (watsonx guidedJSON format).
const RESPONSE_SCHEMA = JSON.stringify({
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      description: 'Split input into 2 to 5 logical sections',
      items: {
        type: 'object',
        properties: {
          id:      { type: 'integer' },
          excerpt: { type: 'string', description: 'First ~10 words of the section for UI reference' },
          dimensions: {
            type: 'array',
            description: '1-2 cognitive dimensions most at stake for this section',
            items: {
              type: 'string',
              enum: ['assumed_knowledge', 'clarity', 'emotional_calibration', 'logical_coherence', 'originality'],
            },
          },
          importance: { type: 'integer', description: 'Impact score 1-5 if creator fixes only this section' },
          personas: {
            type: 'array',
            description: 'Evaluation from all 4 non-overlapping personas',
            items: {
              type: 'object',
              properties: {
                id:         { type: 'string', enum: ['novice', 'expert', 'skeptic', 'emotional'] },
                score:      { type: 'integer', description: 'Score from 1 to 5' },
                confidence: { type: 'number',  description: 'Certainty 0.0 to 1.0' },
                note:       { type: 'string',  description: 'Max 20 words feedback note' },
                emotion:    {
                  type: 'string',
                  description: 'REQUIRED for emotional persona ONLY. Choose 1 from fixed list.',
                  enum: ['curious', 'engaged', 'bored', 'confused', 'surprised', 'moved', 'tense', 'flat'],
                },
              },
              required: ['id', 'score', 'confidence', 'note'],
            },
          },
        },
        required: ['id', 'excerpt', 'dimensions', 'importance', 'personas'],
      },
    },
    overall_summary: {
      type: 'object',
      properties: {
        novice:    { type: 'string', description: '1-2 sentence overall summary for novice' },
        expert:    { type: 'string', description: '1-2 sentence overall summary for expert' },
        skeptic:   { type: 'string', description: '1-2 sentence overall summary for skeptic' },
        emotional: { type: 'string', description: '1-2 sentence overall summary for emotional reader' },
      },
      required: ['novice', 'expert', 'skeptic', 'emotional'],
    },
  },
  required: ['sections', 'overall_summary'],
});

// ── Prompt (module-level constant — never changes per request) ─────────────────
const SYSTEM_INSTRUCTION = `You are the Cognitive Persona Engine for a creative-feedback tool called Cognitive Mirror.

You will receive a piece of creative writing (story opening, pitch, lyric, or tagline).
Evaluate it from FOUR distinct, non-overlapping cognitive perspectives. Each has a strict evaluative heuristic. Do not blend perspectives. Do not let personas influence each other.

PERSONAS:

1. NOVICE — First-time audience, zero context, zero background knowledge. Evaluate ONLY clarity and accessibility. Blind to craft technique — if something requires insider knowledge, flag it, don't excuse it.

2. EXPERT — Domain professional judging craft/genre convention, structure, technique, originality relative to the field. Blind to how confusing this might be to a newcomer.

3. SKEPTIC — Hunts for logical gaps, unearned emotional beats, clichés, unsupported claims. Not interested in polish — interested in whether the piece holds up under scrutiny.

4. EMOTIONAL READER — Reports ONLY felt reaction. Cannot analyze or explain WHY in technical terms. Must select exactly one emotion from this fixed list:
   ["curious", "engaged", "bored", "confused", "surprised", "moved", "tense", "flat"]
   The note field should describe the felt experience only, never the reason.

CRITICAL RULE ON SCORING:
Do not normalize or cluster scores toward the average. Genuine disagreement between personas is desirable and expected — that is the entire point of this tool. If all four personas would reasonably give the same score for a section, give the same score. Otherwise, preserve meaningful, realistic disagreement. Do not artificially converge scores toward 3-4 out of caution.

TASK:
1. Split the input into 2-5 logical sections (paragraphs or sentence groups).
2. For EACH section, each persona independently gives:
   - score (1-5)
   - confidence (0.0-1.0)
   - note (max 20 words)
   - (emotional persona ONLY: also include "emotion" from fixed list)
3. For EACH section, tag 1-2 cognitive dimensions most at stake, from:
   ["assumed_knowledge", "clarity", "emotional_calibration", "logical_coherence", "originality"]
4. For EACH section, give "importance" (1-5): if creator fixed only this section, how impactful to overall piece?
5. Provide one overall 1-2 sentence summary per persona for the whole piece.

You MUST respond with valid JSON only — no markdown fences, no preamble, no explanation outside the JSON object.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPersonaId(value: unknown): value is PersonaId {
  return typeof value === 'string' && VALID_PERSONA_IDS.includes(value as PersonaId);
}

function isDimension(value: unknown): value is DimensionType {
  return typeof value === 'string' && VALID_DIMENSIONS.includes(value as DimensionType);
}

function isEmotion(value: unknown): value is EmotionType {
  return typeof value === 'string' && VALID_EMOTIONS.includes(value as EmotionType);
}

function validatePersonaFeedback(value: unknown, sectionId: number): PersonaFeedback {
  if (!isRecord(value)) {
    throw new Error(`Section ${sectionId} contains invalid persona feedback.`);
  }

  const { id, score, confidence, note, emotion } = value;
  if (!isPersonaId(id)) {
    throw new Error(`Section ${sectionId} contains unknown persona id.`);
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error(`Section ${sectionId} contains invalid score for persona ${id}.`);
  }
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error(`Section ${sectionId} contains invalid confidence for persona ${id}.`);
  }
  if (typeof note !== 'string' || note.trim().length === 0 || note.trim().split(/\s+/).length > 20) {
    throw new Error(`Section ${sectionId} contains invalid note for persona ${id}.`);
  }

  if (id === 'emotional') {
    if (!isEmotion(emotion)) {
      throw new Error(`Section ${sectionId} is missing valid emotion for emotional persona.`);
    }
    return { id, score, confidence, note, emotion };
  }

  if (emotion !== undefined) {
    throw new Error(`Section ${sectionId} has unexpected emotion field for persona ${id}.`);
  }

  return { id, score, confidence, note };
}

function validateSection(value: unknown): SectionResult {
  if (!isRecord(value)) {
    throw new Error('Model returned invalid section payload.');
  }

  const { id, excerpt, dimensions, importance, personas } = value;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
    throw new Error('Model returned invalid section id.');
  }
  const sectionId = id;
  if (typeof excerpt !== 'string' || excerpt.trim().length === 0) {
    throw new Error(`Section ${sectionId} is missing excerpt.`);
  }
  if (!Array.isArray(dimensions) || dimensions.length < 1 || dimensions.length > 2 || !dimensions.every(isDimension)) {
    throw new Error(`Section ${sectionId} has invalid dimensions.`);
  }
  if (typeof importance !== 'number' || !Number.isInteger(importance) || importance < 1 || importance > 5) {
    throw new Error(`Section ${sectionId} has invalid importance.`);
  }
  if (!Array.isArray(personas) || personas.length !== 4) {
    throw new Error(`Section ${sectionId} must contain exactly four personas.`);
  }

  const validatedPersonas = personas.map((persona) => validatePersonaFeedback(persona, sectionId));
  const personaIds = new Set(validatedPersonas.map((persona) => persona.id));
  if (personaIds.size !== 4 || VALID_PERSONA_IDS.some((personaId) => !personaIds.has(personaId))) {
    throw new Error(`Section ${sectionId} must contain novice, expert, skeptic, and emotional personas exactly once.`);
  }

  return {
    id: sectionId,
    excerpt,
    dimensions: dimensions as DimensionType[],
    importance,
    personas: validatedPersonas,
  };
}

export function validateEvaluationResult(value: unknown): EvaluationResult {
  if (!isRecord(value)) {
    throw new Error('AI response was incomplete. Please try again.');
  }

  const { sections, overall_summary: overallSummary } = value;
  if (!Array.isArray(sections) || sections.length < 2 || sections.length > 5) {
    throw new Error('AI response was incomplete. Please try again.');
  }
  if (!isRecord(overallSummary)) {
    throw new Error('AI response was incomplete. Please try again.');
  }

  const novice = overallSummary.novice;
  const expert = overallSummary.expert;
  const skeptic = overallSummary.skeptic;
  const emotional = overallSummary.emotional;
  if (
    typeof novice !== 'string' ||
    typeof expert !== 'string' ||
    typeof skeptic !== 'string' ||
    typeof emotional !== 'string'
  ) {
    throw new Error('AI response was incomplete. Please try again.');
  }

  return {
    sections: sections.map(validateSection),
    overall_summary: {
      novice,
      expert,
      skeptic,
      emotional,
    },
  };
}

export function getValidatedInputText(body: unknown): string {
  if (!isRecord(body) || typeof body.text !== 'string' || body.text.trim().length === 0) {
    throw new Error('Text content is required for evaluation.');
  }

  const trimmedText = body.text.trim();
  if (trimmedText.length > 10_000) {
    throw new Error('Input text must be under 10,000 characters.');
  }

  return trimmedText;
}

export function parseModelPayload(rawContent: string): EvaluationResult {
  const jsonText = rawContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let evaluationData: unknown;
  try {
    evaluationData = JSON.parse(jsonText);
  } catch {
    throw new Error('AI response could not be parsed. Please try again.');
  }

  return validateEvaluationResult(evaluationData);
}

export async function evaluateText(text: string, client: TextChatClient = getWatsonxClient()): Promise<EvaluationResult> {
  const projectId = process.env.WATSONX_PROJECT_ID;
  if (!projectId) {
    throw new Error('WATSONX_PROJECT_ID environment variable is not configured.');
  }

  const response = await client.textChat({
    modelId: 'ibm/granite-3-3-8b-instruct',
    projectId,
    guidedJSON: RESPONSE_SCHEMA,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: `INPUT TEXT:\n"""\n${text}\n"""` },
    ],
    temperature: 0.7,
  }) as WatsonxTextChatResponse;

  const rawContent = response.result?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Received empty response from watsonx.ai model.');
  }

  return parseModelPayload(rawContent);
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cognitive Persona Engine Evaluation Endpoint
app.post('/api/evaluate', evaluateLimiter, async (req, res) => {
  try {
    try {
      const text = getValidatedInputText(req.body);
      const evaluationData = await evaluateText(text);
      return res.json(evaluationData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          error.message === 'Text content is required for evaluation.' ||
          error.message === 'Input text must be under 10,000 characters.'
        ) {
          return res.status(400).json({ error: error.message });
        }
        if (error.message === 'AI response was incomplete. Please try again.') {
          return res.status(502).json({ error: error.message });
        }
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error('Cognitive Mirror Evaluation Error:', error);
    res.status(500).json({
      error: error instanceof Error
        ? error.message
        : 'An unexpected error occurred during cognitive persona analysis.',
    });
  }
});
