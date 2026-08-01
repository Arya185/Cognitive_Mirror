# Cognitive_Mirror

## Production deployment notes
Cognitive Mirror does not generate replacement copy or rewrite your draft for you. It takes your story opening, startup pitch, lyric, or brand tagline, runs one structured OpenRouter evaluation across four distinct reader lenses, and shows where those lenses agree, clash, and expose blind spots you would likely miss on your own.

## Features

- Four independent cognitive personas
- Structured Cognitive Divergence Analysis
- Blind Spot Detection
- Confidence-aware evaluations
- Interactive divergence visualization
- Section-by-section analysis
- Export results as JSON or Markdown
- Single OpenRouter inference per evaluation

## Why Cognitive Mirror?

Most AI writing tools focus on generating content. Cognitive Mirror takes a different approach.

Instead of rewriting a creator's work, it evaluates the same piece of writing through four independent cognitive personas:

- **Novice** – focuses on clarity and accessibility.
- **Expert** – evaluates technical quality and craft.
- **Skeptic** – questions assumptions and identifies weaknesses.
- **Emotional** – measures emotional resonance without performing technical analysis.

The goal is not to tell creators what to write, but to help them understand **how different readers experience their work**.

By comparing these perspectives, Cognitive Mirror reveals cognitive blind spots that are difficult to notice when writing alone.

## Pipeline

```text
Creator Input
  -> Cognitive Persona Engine (OpenRouter / IBM Granite 4.1 8B)
  -> Persona Responses
  -> Divergence Analyzer
  -> Blind Spot Detector
  -> Metacognitive Feedback
```

A single OpenRouter evaluation produces structured feedback from all four personas in one call. Divergence analysis, blind spot detection, confidence aggregation, and visualization are all computed locally afterward, making the system efficient, deterministic, and cost-effective.

## Product Flow

What the creator sees in the app:

1. Paste text or load one of four built-in presets.
2. Run the cognitive evaluation.
3. Review four persona lenses: `novice`, `expert`, `skeptic`, `emotional`.
4. Inspect the divergence spectrogram to find friction hotspots.
5. Click a section hotspot to open deep-dive notes and confidence per persona.
6. Review the Blind Spot Profile across:
   - `assumed_knowledge`
   - `clarity`
   - `emotional_calibration`
   - `logical_coherence`
   - `originality`
7. Review Blind Spot Alerts for specific disconnect patterns.
8. Export the result as `JSON` or `Markdown` from the export modal.

## Architecture

```text
React + Vite UI
      │
      ▼
POST /api/evaluate (Express)
      │
      ▼
OpenRouter `ibm/granite-4.1-8b`
      │
      ▼
Validated structured JSON
      │
      ├── Persona Analysis
      ├── Divergence Analysis
      ├── Blind Spot Profile
      ├── Cognitive Reflection
      └── Export Engine
```

Implementation details:

- one model call per evaluation
- request body limited to `1mb`
- input text limited to `10,000` characters
- `/api/evaluate` rate-limited to `20` requests per minute per IP
- malformed JSON requests normalized to a JSON error response
- model output validated before the UI uses it

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, lucide-react

**Backend:** Express, dotenv

**Tooling:** TypeScript, Vitest, tsx, esbuild

**Model:** OpenRouter — `ibm/granite-4.1-8b`

## Setup

### Prerequisites

- Node.js 18+
- OpenRouter API key

### Environment

```bash
cp .env.example .env
```

Set:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run lint
npm test
npm run build
npm start
```

## Repository Map

```text
src/App.tsx                     main UI flow
src/app.ts                      Express API route and OpenRouter integration
server.ts                       dev/prod server bootstrap
src/components/                 dashboard, input, export, section views
src/lib/sectionStats.ts         divergence math
src/lib/blindSpotProfile.ts     blind-spot percentage math
src/data/presets.ts             persona config, dimensions, demo presets
src/__tests__/                  helper and math tests
```

## License

This project is licensed under the **MIT License**. See [LICENSE.md](LICENSE.md) for the full text.

## Acknowledgements

Cognitive Mirror is powered by **OpenRouter** and the **IBM Granite 4.1 8B** model.

Built using:

- OpenRouter
- IBM Granite (`ibm/granite-4.1-8b`)
- React
- Vite
- Express
- TypeScript