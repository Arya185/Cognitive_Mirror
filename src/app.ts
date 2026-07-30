import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '1mb' }));

// Lazy initializer for Gemini client — replaceable in tests via setAiClient()
let aiClient: GoogleGenAI | null = null;

export function setAiClient(client: GoogleGenAI | null): void {
  aiClient = client;
}

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cognitive Persona Engine Evaluation Endpoint
app.post('/api/evaluate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text content is required for evaluation.' });
    }

    const ai = getGeminiClient();

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        sections: {
          type: Type.ARRAY,
          description: 'Split input into 2 to 5 logical sections',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              excerpt: {
                type: Type.STRING,
                description: 'First ~10 words of the section for UI reference',
              },
              dimensions: {
                type: Type.ARRAY,
                description: '1-2 cognitive dimensions most at stake for this section',
                items: {
                  type: Type.STRING,
                  enum: [
                    'assumed_knowledge',
                    'clarity',
                    'emotional_calibration',
                    'logical_coherence',
                    'originality',
                  ],
                },
              },
              importance: {
                type: Type.INTEGER,
                description: 'Impact score 1-5 if creator fixes only this section',
              },
              personas: {
                type: Type.ARRAY,
                description: 'Evaluation from all 4 non-overlapping personas',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      enum: ['novice', 'expert', 'skeptic', 'emotional'],
                    },
                    score: { type: Type.INTEGER, description: 'Score from 1 to 5' },
                    confidence: { type: Type.NUMBER, description: 'Certainty 0.0 to 1.0' },
                    note: { type: Type.STRING, description: 'Max 20 words feedback note' },
                    emotion: {
                      type: Type.STRING,
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
          type: Type.OBJECT,
          properties: {
            novice: { type: Type.STRING, description: '1-2 sentence overall summary for novice' },
            expert: { type: Type.STRING, description: '1-2 sentence overall summary for expert' },
            skeptic: { type: Type.STRING, description: '1-2 sentence overall summary for skeptic' },
            emotional: { type: Type.STRING, description: '1-2 sentence overall summary for emotional reader' },
          },
          required: ['novice', 'expert', 'skeptic', 'emotional'],
        },
      },
      required: ['sections', 'overall_summary'],
    };

    const systemInstruction = `
You are the Cognitive Persona Engine for a creative-feedback tool called Cognitive Mirror.

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
`;

    const userPrompt = `INPUT TEXT:\n"""\n${text.trim()}\n"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini AI model.');
    }

    const evaluationData = JSON.parse(responseText);

    if (!Array.isArray(evaluationData?.sections) || typeof evaluationData?.overall_summary !== 'object') {
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
