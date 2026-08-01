export function buildEvaluationResponseSchema() {
  return {
    type: "object",
    properties: {
      sections: {
        type: "array",
        description: "Split input into 2 to 5 logical sections",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            excerpt: {
              type: "string",
              description: "First ~10 words of the section for UI reference",
            },
            dimensions: {
              type: "array",
              description:
                "1-2 cognitive dimensions most at stake for this section",
              items: {
                type: "string",
                enum: [
                  "assumed_knowledge",
                  "clarity",
                  "emotional_calibration",
                  "logical_coherence",
                  "originality",
                ],
              },
            },
            importance: {
              type: "integer",
              description:
                "Impact score 1-5 if creator fixes only this section",
            },
            personas: {
              type: "array",
              description: "Evaluation from all 4 non-overlapping personas",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    enum: ["novice", "expert", "skeptic", "emotional"],
                  },
                  score: {
                    type: "integer",
                    description: "Score from 1 to 5",
                  },
                  confidence: {
                    type: "number",
                    description: "Certainty 0.0 to 1.0",
                  },
                  note: {
                    type: "string",
                    description: "Max 20 words feedback note",
                  },
                  emotion: {
                    type: "string",
                    description:
                      "REQUIRED for emotional persona ONLY. Choose 1 from fixed list.",
                    enum: [
                      "curious",
                      "engaged",
                      "bored",
                      "confused",
                      "surprised",
                      "moved",
                      "tense",
                      "flat",
                    ],
                  },
                },
                required: ["id", "score", "confidence", "note"],
              },
            },
          },
          required: ["id", "excerpt", "dimensions", "importance", "personas"],
        },
      },
      overall_summary: {
        type: "object",
        properties: {
          novice: {
            type: "string",
            description: "1-2 sentence overall summary for novice",
          },
          expert: {
            type: "string",
            description: "1-2 sentence overall summary for expert",
          },
          skeptic: {
            type: "string",
            description: "1-2 sentence overall summary for skeptic",
          },
          emotional: {
            type: "string",
            description: "1-2 sentence overall summary for emotional reader",
          },
        },
        required: ["novice", "expert", "skeptic", "emotional"],
      },
    },
    required: ["sections", "overall_summary"],
  };
}

export function buildSystemInstruction() {
  return `
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
}

export function buildUserPrompt(text: string) {
  return `INPUT TEXT:\n"""\n${text.trim()}\n"""`;
}

export async function evaluateText(text: string) {
  const schema = buildEvaluationResponseSchema();

  const prompt = [
    buildSystemInstruction(),
    `Return ONLY valid JSON matching this schema: ${JSON.stringify(schema)}`,
    buildUserPrompt(text),
  ].join("\n\n");

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognitive-mirror-six.vercel.app",
        "X-Title": "Cognitive Mirror",
      },
      body: JSON.stringify({
        model: "ibm-granite/granite-4.1-8b",
        response_format: {
          type: "json_object",
        },
        temperature: 0.7,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "Return ONLY valid JSON. Never use markdown. Never explain.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      `OpenRouter request failed: ${
        error ? JSON.stringify(error) : response.statusText
      }`,
    );
  }

  const data = await response.json();
  const responseText = data?.choices?.[0]?.message?.content?.trim() ?? "";

  if (!responseText) {
    throw new Error("OpenRouter returned an empty response.");
  }

  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("OpenRouter response was not valid JSON.");
    }

    return JSON.parse(jsonMatch[0]);
  }
}
