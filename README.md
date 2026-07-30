# Cognitive Mirror

Train your creative judgment, not just your writing. Cognitive Mirror does not generate replacement copy or rewrite your draft for you. It takes your story opening, startup pitch, lyric, or brand tagline, runs one structured IBM watsonx.ai evaluation across four distinct reader lenses, and shows where those lenses agree, clash, and expose blind spots you would likely miss on your own.

## Pipeline

```text
Creator Input
  -> Cognitive Persona Engine (IBM watsonx.ai / Granite)
  -> Persona Responses
  -> Divergence Analyzer
  -> Blind Spot Detector
  -> Metacognitive Feedback
```

## Judging Criteria

### Technical Execution

Cognitive Mirror uses one IBM watsonx.ai server-side call to return all four persona evaluations, per-section scores, dimensions, and overall summaries in one structured payload. Section divergence, friction hotspots, blind-spot severity percentages, and alert detection are all computed deterministically in app code after response returns. That design is intentional: lower latency, lower cost, fewer failure points, and no extra inference calls for derived analytics.

### Innovation

Core idea is Structured Cognitive Divergence Analysis: instead of asking AI to write for creator, app measures where distinct evaluative mental models disagree, why disagreement happens, and which cognitive dimensions drive that split. Result is judgment-training tool, not generation tool. Creator learns where work is clear, where it excludes newcomers, where craft outruns logic, and where emotion does or does not land.

### Challenge Fit

Project directly supports challenge goal to help creators work smarter, explore new forms of expression, and unlock new creative possibilities. It gives creators richer feedback before publication by simulating multiple reader perspectives at once, then turning that output into actionable metacognitive insight.

### Feasibility

Each evaluation uses one low-cost IBM model call plus local arithmetic. No orchestration graph, no multi-agent chain, no repeated sampling loop. That makes product deployable now for writing workshops, editors, MFA programs, solo founders, indie musicians, and creative coaches without research-lab infrastructure or high marginal inference cost.

### Real-World Impact

Target users are concrete: writing coaches, self-published authors, brand copywriters, startup founders, and songwriters. Demo presets already show range across creative industries: fiction opening, biotech investor pitch, folk lyric, and brand tagline. Same workflow helps users pressure-test audience clarity, originality, logic, and emotional response before public release.

## Product Flow

What creator sees in app:

1. Paste text or load one of four built-in presets.
2. Run cognitive evaluation.
3. Review four persona lenses: `novice`, `expert`, `skeptic`, `emotional`.
4. Inspect divergence spectrogram to find friction hotspots.
5. Click section hotspot to open deep-dive notes and confidence per persona.
6. Review Blind Spot Profile across:
   - `assumed_knowledge`
   - `clarity`
   - `emotional_calibration`
   - `logical_coherence`
   - `originality`
7. Review Blind Spot Alerts for specific disconnect patterns.
8. Export result as `JSON` or `Markdown` from export modal.

## Technical Notes

Architecture:

```text
React + Vite UI
      |
      v
POST /api/evaluate (Express)
      |
      v
IBM watsonx.ai `ibm/granite-3-3-8b-instruct`
      |
      v
Validated structured JSON
      |
      +--> section divergence stats
      +--> blind-spot profile percentages
      +--> alert detection
      +--> exportable report
```

Implementation details:

- one model call per evaluation
- request body limited to `1mb`
- input text limited to `10,000` characters
- `/api/evaluate` rate-limited to `20` requests per minute per IP
- malformed JSON requests normalized to JSON error response
- model output validated before UI uses it

## Setup

### Prerequisites

- Node.js 18+
- IBM Cloud account with watsonx.ai project

### Environment

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
src/app.ts                      Express API route and IBM watsonx integration
server.ts                       dev/prod server bootstrap
src/components/                 dashboard, input, export, section views
src/lib/sectionStats.ts         divergence math
src/lib/blindSpotProfile.ts     blind-spot percentage math
src/data/presets.ts             persona config, dimensions, demo presets
src/__tests__/                  helper and math tests
```

## Submission Notes

IBM SkillsBuild / Bob learning activity completed:
Team should replace this line with exact activity name and completion detail before final submission.
