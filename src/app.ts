import express from 'express';
import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import { IamAuthenticator } from '@ibm-cloud/watsonx-ai/authentication';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '1mb' }));

// Rate-limit the AI evaluation endpoint to prevent API quota abuse and unexpected billing.
// 20 requests per minute per IP is generous for interactive use.
const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many evaluation requests. Please wait a moment before trying again.' },
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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cognitive Persona Engine Evaluation Endpoint
app.post('/api/evaluate', evaluateLimiter, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required for evaluation.' });
    }

    // Guard against excessively large inputs that would cause token limit errors
    // or unexpected cost overruns on the watsonx.ai API.
    if (text.trim().length > 10_000) {
      return res.status(400).json({ error: 'Input text must be under 10,000 characters.' });
    }

    const projectId = process.env.WATSONX_PROJECT_ID;
    if (!projectId) {
      return res.status(500).json({ error: 'WATSONX_PROJECT_ID environment variable is not configured.' });
    }

    const client = getWatsonxClient();

    const response = await client.textChat({
      modelId:   'ibm/granite-3-8b-instruct',
      projectId,
      guidedJSON: RESPONSE_SCHEMA,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user',   content: `INPUT TEXT:\n"""\n${text.trim()}\n"""` },
      ],
      temperature: 0.7,
    });

    const rawContent = response.result?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Received empty response from watsonx.ai model.');
    }

    // Strip markdown code fences if the model wraps its output despite the instruction
    const jsonText = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    let evaluationData: unknown;
    try {
      evaluationData = JSON.parse(jsonText);
    } catch {
      throw new Error('Model returned non-JSON output. Please try again.');
    }

    if (
      !Array.isArray((evaluationData as any)?.sections) ||
      typeof (evaluationData as any)?.overall_summary !== 'object'
    ) {
      return res.status(502).json({
        error: 'Model returned an unexpected response shape. Please try again.',
      });
    }

    res.json(evaluationData);
  } catch (error: any) {
    console.error('Cognitive Mirror Evaluation Error:', error);
    res.status(500).json({
      error: error.message || 'An unexpected error occurred during cognitive persona analysis.',
    });
  }
});
