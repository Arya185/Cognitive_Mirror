import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmotionType, EvaluationResult, PersonaId } from '../types.js';
import {
  evaluateText,
  getValidatedInputText,
  parseModelPayload,
  setAiClient,
  validateEvaluationResult,
} from '../app.js';

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

function buildValidPayload(sectionCount = 2): string {
  const sections: import('../types.js').SectionResult[] = Array.from({ length: sectionCount }, (_, i) => ({
    id: i + 1,
    excerpt: `Section ${i + 1} excerpt text here`,
    dimensions: ['clarity' as const],
    importance: 3,
    personas: [
      { id: 'novice' as const, score: 3, confidence: 0.8, note: 'Fairly clear overall.' },
      { id: 'expert' as const, score: 4, confidence: 0.9, note: 'Solid technique shown.' },
      { id: 'skeptic' as const, score: 2, confidence: 0.7, note: 'Unearned claim detected.' },
      { id: 'emotional' as const, score: 4, confidence: 0.85, note: 'Felt a pull forward.', emotion: 'curious' as const },
    ],
  }));

  const payload: EvaluationResult = {
    sections,
    overall_summary: {
      novice: 'Accessible writing with a clear hook.',
      expert: 'Technically competent, shows strong voice.',
      skeptic: 'Some claims need stronger grounding.',
      emotional: 'Evoked a strong sense of curiosity.',
    },
  };
  return JSON.stringify(payload);
}

describe('evaluation helpers', () => {
  const mockTextChat = vi.fn();
  const fakeClient = { textChat: mockTextChat } as any;

  beforeEach(() => {
    process.env.WATSONX_API_KEY = 'test-key';
    process.env.WATSONX_PROJECT_ID = 'test-project';
    process.env.WATSONX_SERVICE_URL = 'https://test.ml.cloud.ibm.com';
    mockTextChat.mockReset();
    setAiClient(fakeClient);
  });

  afterEach(() => {
    setAiClient(null);
  });

  describe('validateEvaluationResult / parseModelPayload', () => {
    it('returns parsed JSON with a top-level sections array', () => {
      const body = parseModelPayload(buildValidPayload(2));
      expect(Array.isArray(body.sections)).toBe(true);
    });

    it('returns an overall_summary object with all four persona keys', () => {
      const { overall_summary } = parseModelPayload(buildValidPayload(2));
      expect(typeof overall_summary.novice).toBe('string');
      expect(typeof overall_summary.expert).toBe('string');
      expect(typeof overall_summary.skeptic).toBe('string');
      expect(typeof overall_summary.emotional).toBe('string');
    });

    it('every section contains exactly 4 personas: novice, expert, skeptic, emotional', () => {
      const { sections } = parseModelPayload(buildValidPayload(3));
      for (const section of sections) {
        expect(section.personas).toHaveLength(4);
        const ids = section.personas.map((p: { id: PersonaId }) => p.id).sort();
        expect(ids).toEqual(['emotional', 'expert', 'novice', 'skeptic']);
      }
    });

    it('each persona in every section has required fields (id, score, confidence, note)', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        for (const persona of section.personas) {
          expect(persona).toHaveProperty('id');
          expect(persona).toHaveProperty('score');
          expect(persona).toHaveProperty('confidence');
          expect(persona).toHaveProperty('note');
        }
      }
    });

    it('each section has valid dimensions array (1-2 entries from fixed list)', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        expect(Array.isArray(section.dimensions)).toBe(true);
        expect(section.dimensions.length).toBeGreaterThanOrEqual(1);
        expect(section.dimensions.length).toBeLessThanOrEqual(2);
        for (const dim of section.dimensions) {
          expect(VALID_DIMENSIONS).toContain(dim);
        }
      }
    });

    it('each section importance score is an integer between 1 and 5', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        expect(Number.isInteger(section.importance)).toBe(true);
        expect(section.importance).toBeGreaterThanOrEqual(1);
        expect(section.importance).toBeLessThanOrEqual(5);
      }
    });

    it('persona scores are integers between 1 and 5', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        for (const persona of section.personas) {
          expect(Number.isInteger(persona.score)).toBe(true);
          expect(persona.score).toBeGreaterThanOrEqual(1);
          expect(persona.score).toBeLessThanOrEqual(5);
        }
      }
    });

    it('persona confidence is a number between 0.0 and 1.0', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        for (const persona of section.personas) {
          expect(typeof persona.confidence).toBe('number');
          expect(persona.confidence).toBeGreaterThanOrEqual(0);
          expect(persona.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    it('emotional persona includes an "emotion" field from fixed list', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        const emotional = section.personas.find((p: { id: PersonaId }) => p.id === 'emotional');
        expect(emotional).toBeDefined();
        expect(emotional).toHaveProperty('emotion');
        expect(VALID_EMOTIONS).toContain(emotional!.emotion as EmotionType);
      }
    });

    it('non-emotional personas do not include an "emotion" field', () => {
      const { sections } = parseModelPayload(buildValidPayload(2));
      for (const section of sections) {
        for (const personaId of ['novice', 'expert', 'skeptic'] as const) {
          const persona = section.personas.find((p: { id: PersonaId }) => p.id === personaId);
          expect(persona).toBeDefined();
          expect(persona).not.toHaveProperty('emotion');
        }
      }
    });

    it('emotional persona emotion value is one of 8 allowed emotions', () => {
      for (const emotion of VALID_EMOTIONS) {
        const sections: import('../types.js').SectionResult[] = [
          {
            id: 1,
            excerpt: 'Test excerpt text here',
            dimensions: ['clarity' as const],
            importance: 3,
            personas: [
              { id: 'novice' as const, score: 3, confidence: 0.8, note: 'Clear enough.' },
              { id: 'expert' as const, score: 4, confidence: 0.9, note: 'Well crafted.' },
              { id: 'skeptic' as const, score: 2, confidence: 0.7, note: 'Logical gap.' },
              { id: 'emotional' as const, score: 4, confidence: 0.85, note: 'Felt it.', emotion },
            ],
          },
          {
            id: 2,
            excerpt: 'Second excerpt text here',
            dimensions: ['originality' as const],
            importance: 4,
            personas: [
              { id: 'novice' as const, score: 3, confidence: 0.8, note: 'Clear enough.' },
              { id: 'expert' as const, score: 4, confidence: 0.9, note: 'Well crafted.' },
              { id: 'skeptic' as const, score: 2, confidence: 0.7, note: 'Logical gap.' },
              { id: 'emotional' as const, score: 4, confidence: 0.85, note: 'Felt it.', emotion },
            ],
          },
        ];

        const result = validateEvaluationResult({
          sections,
          overall_summary: { novice: 'OK', expert: 'OK', skeptic: 'OK', emotional: 'OK' },
        });

        const emotionalPersona = result.sections[0].personas.find((p) => p.id === 'emotional');
        expect(emotionalPersona?.emotion).toBe(emotion);
      }
    });

    it('strips markdown code fences and still parses payload', () => {
      const result = parseModelPayload(`\`\`\`json\n${buildValidPayload(2)}\n\`\`\``);
      expect(Array.isArray(result.sections)).toBe(true);
    });

    it('rejects JSON array instead of object', () => {
      expect(() => parseModelPayload(JSON.stringify([{ unexpected: 'array response' }])))
        .toThrow(/unexpected response shape/i);
    });

    it('rejects valid JSON object with missing sections key', () => {
      expect(() => parseModelPayload(JSON.stringify({
        overall_summary: { novice: 'x', expert: 'x', skeptic: 'x', emotional: 'x' },
      }))).toThrow(/unexpected response shape/i);
    });

    it('rejects malformed non-JSON text', () => {
      expect(() => parseModelPayload('This is definitely not JSON {{{'))
        .toThrow(/non-json/i);
    });

    it('rejects missing emotional field on emotional persona', () => {
      const invalid = JSON.stringify({
        sections: [
          {
            id: 1,
            excerpt: 'Bad section',
            dimensions: ['clarity'],
            importance: 3,
            personas: [
              { id: 'novice', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'expert', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'skeptic', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'emotional', score: 3, confidence: 0.8, note: 'ok' },
            ],
          },
          {
            id: 2,
            excerpt: 'Good section',
            dimensions: ['clarity'],
            importance: 3,
            personas: [
              { id: 'novice', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'expert', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'skeptic', score: 3, confidence: 0.8, note: 'ok' },
              { id: 'emotional', score: 3, confidence: 0.8, note: 'ok', emotion: 'curious' },
            ],
          },
        ],
        overall_summary: { novice: 'x', expert: 'x', skeptic: 'x', emotional: 'x' },
      });

      expect(() => parseModelPayload(invalid)).toThrow(/emotion/i);
    });
  });

  describe('getValidatedInputText', () => {
    it('returns trimmed text', () => {
      expect(getValidatedInputText({ text: '  Hello, world.  ' })).toBe('Hello, world.');
    });

    it('throws when text field is missing', () => {
      expect(() => getValidatedInputText({})).toThrow(/required/i);
    });

    it('throws when text is empty string', () => {
      expect(() => getValidatedInputText({ text: '' })).toThrow(/required/i);
    });

    it('throws when text is whitespace only', () => {
      expect(() => getValidatedInputText({ text: '   \n\t  ' })).toThrow(/required/i);
    });

    it('throws when text field is non-string', () => {
      expect(() => getValidatedInputText({ text: 42 })).toThrow(/required/i);
    });

    it('throws when text exceeds character limit', () => {
      expect(() => getValidatedInputText({ text: 'x'.repeat(10_001) })).toThrow(/under 10,000/i);
    });
  });

  describe('evaluateText', () => {
    it('does not call real watsonx API and returns validated payload', async () => {
      mockTextChat.mockResolvedValue({
        result: {
          choices: [{ message: { content: buildValidPayload(2) } }],
        },
      });

      const result = await evaluateText('Any text.', fakeClient);

      expect(mockTextChat).toHaveBeenCalledTimes(1);
      expect(result.sections).toHaveLength(2);
    });

    it('forwards trimmed user text to model messages', async () => {
      mockTextChat.mockResolvedValue({
        result: {
          choices: [{ message: { content: buildValidPayload(2) } }],
        },
      });

      await evaluateText(getValidatedInputText({ text: '  Hello, world.  ' }), fakeClient);

      const callArg = mockTextChat.mock.calls[0][0] as Record<string, unknown>;
      const messages = callArg.messages as Array<{ role: string; content: string }>;
      const userMsg = messages.find((m) => m.role === 'user');
      expect(userMsg?.content).toContain('Hello, world.');
      expect(userMsg?.content).not.toContain('  Hello, world.  ');
    });

    it('throws when watsonx client errors', async () => {
      mockTextChat.mockRejectedValue(new Error('watsonx.ai API unavailable'));
      await expect(evaluateText('This text triggers a model error.', fakeClient))
        .rejects.toThrow(/watsonx\.ai api unavailable/i);
    });

    it('throws when model returns empty response', async () => {
      mockTextChat.mockResolvedValue({
        result: {
          choices: [{ message: { content: null } }],
        },
      });
      await expect(evaluateText('This text gets an empty model response.', fakeClient))
        .rejects.toThrow(/empty response/i);
    });

    it('throws when WATSONX_PROJECT_ID is not configured', async () => {
      delete process.env.WATSONX_PROJECT_ID;
      await expect(evaluateText('test', fakeClient))
        .rejects.toThrow(/WATSONX_PROJECT_ID/i);
    });
  });
});
