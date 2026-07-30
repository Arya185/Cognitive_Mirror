# Cognitive Mirror

Creative writing analysis app that runs one IBM watsonx.ai evaluation, then computes disagreement and blind-spot signals client-side.

## What app does

Paste short-form writing, run evaluation, inspect how four reader lenses disagree:

- `novice` checks clarity and accessibility
- `expert` judges craft, structure, and originality
- `skeptic` hunts for logical gaps and unearned beats
- `emotional` reports raw felt reaction with fixed emotion label

App returns:

- section-by-section persona scores, confidence, notes, and emotional tag
- per-persona overall summaries
- divergence metrics per section
- blind-spot severity by dimension
- automatic blind-spot alerts
- export as `JSON` or `Markdown`

## Architecture

```text
React + Vite UI
      |
      v
POST /api/evaluate (Express)
      |
      v
IBM watsonx.ai `ibm/granite-3-8b-instruct`
      |
      v
Structured JSON response
      |
      +--> client-side section divergence stats
      +--> client-side blind-spot profile
      +--> client-side alert detection
```

Important behavior:

- one model call per evaluation
- input limited to `10,000` characters
- `/api/evaluate` rate-limited to `20` requests per minute per IP
- input JSON body limited to `1mb`
- health check at `/api/health`

## Tech stack

- React 19
- Vite 6
- Express 4
- TypeScript
- IBM watsonx.ai Node SDK
- Vitest

## Project structure

```text
src/App.tsx                     main UI flow
src/app.ts                      Express app and `/api/evaluate`
server.ts                       dev/prod server bootstrap
src/components/                 dashboard, input, export, section views
src/lib/sectionStats.ts         divergence math
src/lib/blindSpotProfile.ts     blind-spot severity math
src/data/presets.ts             persona config, dimensions, sample presets
src/__tests__/                  API and pure-function tests
```

## Setup

### Prerequisites

- Node.js 18+
- IBM Cloud account with watsonx.ai project

### Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set:

```bash
WATSONX_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
```

Optional:

```bash
WATSONX_SERVICE_URL=https://us-south.ml.cloud.ibm.com
```

## Scripts

```bash
npm install
npm run dev
```

`npm run dev` starts single Node process from `server.ts`. In development, Express mounts Vite middleware and serves UI + API on same port, default `3000`.

Other scripts:

```bash
npm run build       # type-check, build client, bundle server to dist/server.mjs
npm start           # serve production build
npm run lint        # TypeScript check only
npm test            # Vitest run
npm run test:watch  # Vitest watch mode
```

## How to use

1. Open app.
2. Paste text or load one of four built-in presets: story opening, pitch, lyric, tagline.
3. Click `Run Cognitive Evaluation`.
4. Review `Persona Mean Telemetry` for average score and confidence per lens.
5. Review `Cognitive Divergence Spectrogram` for spread, standard deviation, and friction hotspots per section.
6. Review `Blind Spot Profile` for disagreement severity across `assumed_knowledge`, `clarity`, `emotional_calibration`, `logical_coherence`, and `originality`.
7. Review `Cognitive Blind Spot Detection` alerts for:
   - assumed knowledge gap
   - unearned polish / logical gap
   - clear but viscerally flat
8. Use `Sectional Deep-Dive Telemetry` to inspect notes, confidence, and emotional labels per section.
9. Export report as `JSON` or `Markdown`.

## API

### `POST /api/evaluate`

Request:

```json
{
  "text": "Your writing sample here"
}
```

Validation:

- `text` required
- `text` must be string
- trimmed text must be non-empty
- trimmed text must be under `10,000` characters

Response shape:

```json
{
  "sections": [
    {
      "id": 1,
      "excerpt": "First ~10 words",
      "dimensions": ["clarity", "originality"],
      "importance": 4,
      "personas": [
        {
          "id": "novice",
          "score": 3,
          "confidence": 0.82,
          "note": "Readable but jargon slows entry."
        }
      ]
    }
  ],
  "overall_summary": {
    "novice": "...",
    "expert": "...",
    "skeptic": "...",
    "emotional": "..."
  }
}
```

## Testing

Current tests cover:

- API route behavior with mocked watsonx client
- blind-spot profile computation

Run:

```bash
npm test
```
