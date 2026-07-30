# Cognitive Mirror

**Train your creative judgment, not just your writing.**

Most AI writing tools rewrite or polish your draft. Cognitive Mirror does something different: it reads your text as four fundamentally different kinds of reader simultaneously — and shows you exactly where they disagree. A novelist, a domain expert, a logical skeptic, and a purely emotional reactor will each experience your pitch, lyric, or story opening differently. The places where they diverge the most are where your writing is either doing something genuinely interesting, or quietly failing people you didn't expect. Cognitive Mirror makes that invisible gap visible.

---

## Pipeline

```
Creator Input
     │
     ▼
Cognitive Persona Engine (IBM watsonx.ai — Granite)
     │  Single structured-JSON call: 4 personas × N sections
     ▼
Persona Responses
     │  { sections[], overall_summary }
     ▼
Divergence Analyzer          ← client-side, deterministic
     │  std-dev per section, range, friction hotspots
     ▼
Blind Spot Detector          ← client-side, deterministic
     │  per-dimension severity % (no extra model calls)
     ▼
Metacognitive Feedback
     │  Divergence Spectrogram · Blind Spot Profile · Section Deep-Dive
     ▼
Creator
```

> **Design note:** only one AI call is made per evaluation — the IBM Bob (watsonx.ai) call that returns the full structured JSON. Divergence scoring and the Blind Spot Profile are computed entirely on the server-side response with pure arithmetic. This keeps the app fast, deterministic, and credit-efficient.

---

## Powered by IBM watsonx.ai

This project was built for the **IBM Bob AI Builders Challenge (July 2025)**. The Cognitive Persona Engine runs on **IBM watsonx.ai** using the `ibm/granite-3-8b-instruct` foundation model. The model is called via the `@ibm-cloud/watsonx-ai` Node.js SDK with `guidedJSON` structured output to enforce the response schema at the model level.

**IBM SkillsBuild / Bob learning activity completed:** *(team member — fill in the activity name and completion date here before submission)*

---

## Setup

### Prerequisites

- Node.js 18+
- An [IBM Cloud account](https://cloud.ibm.com/) with a watsonx.ai project

### Environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```
WATSONX_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
# Optional (defaults to us-south):
# WATSONX_SERVICE_URL=https://us-south.ml.cloud.ibm.com
```

You can find your project ID in the watsonx.ai console under **Manage → General → Project ID**.

### Install and run

```bash
npm install

# Development (Vite HMR + Express API server on :3000)
npm run dev

# Production build
npm run build

# Serve production build
npm start
```

---

## How to use it

1. **Paste your text** — story opening, pitch, lyric, or tagline — into the input area, or pick one of the four built-in sample presets.
2. **Click "Run Cognitive Evaluation"** — a single IBM Bob call analyses the text and returns structured per-section scores for all four personas.
3. **Read the Persona Mean Telemetry** — at a glance: how did each lens rate the piece overall?
4. **Scan the Divergence Spectrogram** — each section gets a needle chart showing where the four personas landed. Clustered needles = consensus. Wide-spread needles = friction.
5. **Click a friction hotspot** — the section scrolls into focus in the Deep-Dive Telemetry panel below, where you can read each persona's specific note and confidence score.
6. **Read the Blind Spot Profile** — five horizontal bars show *which cognitive dimensions* attracted the most cross-persona disagreement. A high `ASSUMED KNOWLEDGE` bar, for example, means your expert loved it but your novice was left behind. This is the part no AI writing tool will tell you.
7. **Check the Blind Spot Alerts** — three automatically-detected disconnect patterns: assumed knowledge gap, unearned polish, and visceral flatness despite clarity.
8. **Export** — download the full evaluation as JSON or Markdown for your own notes.

---

## Development

```bash
# Type-check only (no emit)
npm run lint

# Run unit tests (Vitest, no live credentials needed — mocked)
npm test

# Watch mode
npm run test:watch
```

Tests live in `src/__tests__/`. The API route test (`evaluate.test.ts`) fully mocks the watsonx.ai SDK. The pure-function test (`blindSpotProfile.test.ts`) tests the divergence-to-severity computation with no dependencies.
