/**
 * Test suite for POST /api/evaluate
 *
 * Strategy
 * ─────────
 * `@ibm-cloud/watsonx-ai` and its `authentication` sub-path are fully mocked
 * via vi.mock() so no live credentials are needed.
 *
 * The mock replaces `client.textChat()` — the only method the route calls.
 * `_nextContent` controls the string the mock returns as
 *   response.result.choices[0].message.content
 * `_nextError` makes the mock throw instead.
 *
 * The Express app is imported from src/app.ts (which does NOT call startServer),
 * so no port is bound during the test run.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import type { EvaluationResult, PersonaId, EmotionType } from '../types.js';

// ── Mock @ibm-cloud/watsonx-ai ────────────────────────────────────────────────

let _nextContent: string | null = null;
let _nextError: Error | null = null;

const mockTextChat = vi.fn(async () => {
  if (_nextError) throw _nextError;
  return {
    result: {
      choices: [{ message: { content: _nextContent } }],
    },
  };
});

vi.mock('@ibm-cloud/watsonx-ai', () => ({
  WatsonXAI: {
    newInstance: vi.fn(() => ({ textChat: mockTextChat })),
  },
}));

vi.mock('@ibm-cloud/watsonx-ai/authentication', () => ({
  IamAuthenticator: vi.fn(function () { return {}; }),
}));

// ── Test helpers ──────────────────────────────────────────────────────────────

const VALID_EMOTIONS: EmotionType[] = [
  'curious', 'engaged', 'bored', 'confused',
  'surprised', 'moved', 'tense', 'flat',
];

const VALID_DIMENSIONS = [
  'assumed_knowledge',
  'clarity',
  'emotional_calibration',
  'logical_coherence',
  'originality',
] as const;

/** Builds a minimal but schema-conformant EvaluationResult JSON string. */
function buildValidPayload(sectionCount = 2): string {
  const sections: import('../types.js').SectionResult[] = Array.from({ length: sectionCount }, (_, i) => ({
    id: i + 1,
    excerpt: `Section ${i + 1} excerpt text here`,
    dimensions: ['clarity' as const],
    importance: 3,
    personas: [
      { id: 'novice'    as const, score: 3, confidence: 0.8,  note: 'Fairly clear overall.' },
      { id: 'expert'    as const, score: 4, confidence: 0.9,  note: 'Solid technique shown.' },
      { id: 'skeptic'   as const, score: 2, confidence: 0.7,  note: 'Unearned claim detected.' },
      { id: 'emotional' as const, score: 4, confidence: 0.85, note: 'Felt a pull forward.', emotion: 'curious' as const },
    ],
  }));

  const payload: EvaluationResult = {
    sections,
    overall_summary: {
      novice:    'Accessible writing with a clear hook.',
      expert:    'Technically competent, shows strong voice.',
      skeptic:   'Some claims need stronger grounding.',
      emotional: 'Evoked a strong sense of curiosity.',
    },
  };
  return JSON.stringify(payload);
}

// ── Import app AFTER mocks are declared ──────────────────────────────────────
// Dynamic import ensures vi.mock() is hoisted and applied before the module loads.

// Set required env vars before importing app (WATSONX_PROJECT_ID is read per-request)
process.env.WATSONX_API_KEY     = 'test-key';
process.env.WATSONX_PROJECT_ID  = 'test-project';
process.env.WATSONX_SERVICE_URL = 'https://test.ml.cloud.ibm.com';

const { app, setAiClient } = await import('../app.js');

// Inject a fake client directly (bypasses WatsonXAI.newInstance entirely)
const fakeClient = { textChat: mockTextChat } as any;
setAiClient(fakeClient);

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('POST /api/evaluate', () => {
  beforeEach(() => {
    _nextContent = null;
    _nextError = null;
    mockTextChat.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Re-inject the fake client so other test files or ordering changes cannot
    // accidentally leave aiClient in a null/wrong state between tests.
    setAiClient(fakeClient);
  });

  // ── 1. Schema validation ───────────────────────────────────────────────────

  describe('response schema enforcement', () => {
    it('returns parsed JSON with a top-level sections array', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Once upon a time in a distant land.' });

      expect(res.status).toBe(200);
      const body = res.body as EvaluationResult;
      expect(Array.isArray(body.sections)).toBe(true);
    });

    it('returns an overall_summary object with all four persona keys', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Once upon a time in a distant land.' });

      expect(res.status).toBe(200);
      const { overall_summary } = res.body as EvaluationResult;
      expect(typeof overall_summary).toBe('object');
      expect(typeof overall_summary.novice).toBe('string');
      expect(typeof overall_summary.expert).toBe('string');
      expect(typeof overall_summary.skeptic).toBe('string');
      expect(typeof overall_summary.emotional).toBe('string');
    });

    it('every section contains exactly 4 personas: novice, expert, skeptic, emotional', async () => {
      _nextContent = buildValidPayload(3);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'A pitch for a revolutionary product idea.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        expect(section.personas).toHaveLength(4);
        const ids = section.personas.map((p: { id: PersonaId }) => p.id).sort();
        expect(ids).toEqual(['emotional', 'expert', 'novice', 'skeptic']);
      }
    });

    it('each persona in every section has the required fields (id, score, confidence, note)', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'The stars aligned on that cold November morning.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        for (const persona of section.personas) {
          expect(persona).toHaveProperty('id');
          expect(persona).toHaveProperty('score');
          expect(persona).toHaveProperty('confidence');
          expect(persona).toHaveProperty('note');
        }
      }
    });

    it('each section has a valid dimensions array (1-2 entries from the fixed list)', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'A lyric fragment with emotional weight.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        expect(Array.isArray(section.dimensions)).toBe(true);
        expect(section.dimensions.length).toBeGreaterThanOrEqual(1);
        expect(section.dimensions.length).toBeLessThanOrEqual(2);
        for (const dim of section.dimensions) {
          expect(VALID_DIMENSIONS).toContain(dim);
        }
      }
    });

    it('each section importance score is an integer between 1 and 5', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'A tagline that needs critique.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        expect(Number.isInteger(section.importance)).toBe(true);
        expect(section.importance).toBeGreaterThanOrEqual(1);
        expect(section.importance).toBeLessThanOrEqual(5);
      }
    });

    it('persona scores are integers between 1 and 5', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Short punchy opener.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        for (const persona of section.personas) {
          expect(Number.isInteger(persona.score)).toBe(true);
          expect(persona.score).toBeGreaterThanOrEqual(1);
          expect(persona.score).toBeLessThanOrEqual(5);
        }
      }
    });

    it('persona confidence is a number between 0.0 and 1.0', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Short punchy opener.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        for (const persona of section.personas) {
          expect(typeof persona.confidence).toBe('number');
          expect(persona.confidence).toBeGreaterThanOrEqual(0);
          expect(persona.confidence).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  // ── 2. Emotional persona "emotion" field ──────────────────────────────────

  describe('"emotion" field on the emotional persona', () => {
    it('emotional persona includes an "emotion" field from the fixed list', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'The silence was louder than any scream.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        const emotional = section.personas.find((p: { id: PersonaId }) => p.id === 'emotional');
        expect(emotional).toBeDefined();
        expect(emotional).toHaveProperty('emotion');
        expect(VALID_EMOTIONS).toContain(emotional!.emotion);
      }
    });

    it('novice persona does NOT include an "emotion" field', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'The silence was louder than any scream.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        const novice = section.personas.find((p: { id: PersonaId }) => p.id === 'novice');
        expect(novice).toBeDefined();
        expect(novice).not.toHaveProperty('emotion');
      }
    });

    it('expert persona does NOT include an "emotion" field', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Iambic pentameter gone slightly wrong.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        const expert = section.personas.find((p: { id: PersonaId }) => p.id === 'expert');
        expect(expert).toBeDefined();
        expect(expert).not.toHaveProperty('emotion');
      }
    });

    it('skeptic persona does NOT include an "emotion" field', async () => {
      _nextContent = buildValidPayload(2);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'An unearned emotional beat in the middle.' });

      expect(res.status).toBe(200);
      const { sections } = res.body as EvaluationResult;

      for (const section of sections) {
        const skeptic = section.personas.find((p: { id: PersonaId }) => p.id === 'skeptic');
        expect(skeptic).toBeDefined();
        expect(skeptic).not.toHaveProperty('emotion');
      }
    });

    it('emotional persona emotion value is one of the 8 allowed emotions', async () => {
      for (const emotion of VALID_EMOTIONS) {
        const sections: import('../types.js').SectionResult[] = [
          {
            id: 1,
            excerpt: 'Test excerpt text here',
            dimensions: ['clarity' as const],
            importance: 3,
            personas: [
              { id: 'novice'    as const, score: 3, confidence: 0.8,  note: 'Clear enough.' },
              { id: 'expert'    as const, score: 4, confidence: 0.9,  note: 'Well crafted.' },
              { id: 'skeptic'   as const, score: 2, confidence: 0.7,  note: 'Logical gap.' },
              { id: 'emotional' as const, score: 4, confidence: 0.85, note: 'Felt it.', emotion: emotion },
            ],
          },
        ];
        _nextContent = JSON.stringify({
          sections,
          overall_summary: { novice: 'OK', expert: 'OK', skeptic: 'OK', emotional: 'OK' },
        });

        const res = await request(app)
          .post('/api/evaluate')
          .send({ text: 'Test input for emotion validation.' });

        expect(res.status).toBe(200);
        const emotionalPersona = res.body.sections[0].personas.find(
          (p: { id: string }) => p.id === 'emotional',
        );
        expect(emotionalPersona.emotion).toBe(emotion);
      }
    });
  });

  // ── 3. Error-handling tests ───────────────────────────────────────────────

  describe('input validation errors', () => {
    it('returns 400 when text field is missing', async () => {
      const res = await request(app).post('/api/evaluate').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when text is an empty string', async () => {
      const res = await request(app).post('/api/evaluate').send({ text: '' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when text is whitespace only', async () => {
      const res = await request(app).post('/api/evaluate').send({ text: '   \n\t  ' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/required/i);
    });

    it('returns 400 when text field is a non-string type (number)', async () => {
      const res = await request(app).post('/api/evaluate').send({ text: 42 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when the request body is missing entirely (no JSON)', async () => {
      // NOTE: This 400 originates from Express's built-in JSON body-parser
      // (SyntaxError on empty string), NOT from the route's own `text` validation.
      // The response body will contain Express's SyntaxError message, not our
      // custom "Text content is required" message.
      const res = await request(app)
        .post('/api/evaluate')
        .set('Content-Type', 'application/json')
        .send('');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('model error handling', () => {
    it('returns 500 when the watsonx.ai API throws an error', async () => {
      _nextError = new Error('watsonx.ai API unavailable');

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'This text triggers a model error.' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/watsonx\.ai API unavailable/i);
    });

    it('returns 500 when the model returns an empty response', async () => {
      _nextContent = null;

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'This text gets an empty model response.' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/empty response/i);
    });

    it('returns 500 when the model returns malformed (non-JSON) text', async () => {
      _nextContent = 'This is definitely not JSON {{{';

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Good input, bad model output.' });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 502 when the model returns a JSON array instead of an object', async () => {
      _nextContent = JSON.stringify([{ unexpected: 'array response' }]);

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Good input, unexpected model shape.' });

      expect(res.status).toBe(502);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 502 when the model returns a valid JSON object with missing sections key', async () => {
      _nextContent = JSON.stringify({ overall_summary: { novice: 'x', expert: 'x', skeptic: 'x', emotional: 'x' } });

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Good input, incomplete model shape.' });

      expect(res.status).toBe(502);
      expect(res.body).toHaveProperty('error');
    });

    it('strips markdown code fences and still parses the payload', async () => {
      _nextContent = '```json\n' + buildValidPayload(2) + '\n```';

      const res = await request(app)
        .post('/api/evaluate')
        .send({ text: 'Model wraps output in code fence.' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sections)).toBe(true);
    });
  });

  // ── 4. Mock isolation sanity checks ──────────────────────────────────────

  describe('mock isolation', () => {
    it('does NOT call the real watsonx.ai API (mock is always used)', async () => {
      _nextContent = buildValidPayload(2);

      await request(app).post('/api/evaluate').send({ text: 'Any text.' });

      expect(mockTextChat).toHaveBeenCalledTimes(1);
      const callArg = (mockTextChat.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
      expect(callArg).toHaveProperty('modelId');
      expect(callArg).toHaveProperty('messages');
    });

    it('forwards the trimmed user text to the model messages', async () => {
      _nextContent = buildValidPayload(2);
      const inputText = '  Hello, world.  ';

      await request(app).post('/api/evaluate').send({ text: inputText });

      expect(mockTextChat).toHaveBeenCalledTimes(1);
      const callArg = (mockTextChat.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
      const messages = callArg.messages as Array<{ role: string; content: string }>;
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('Hello, world.');
    });
  });
});
