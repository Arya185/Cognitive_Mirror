import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getServerConfig, validateServerEnv } from "./src/config/server.js";
import { evaluateTextWithWatsonx } from "./src/lib/ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const config = getServerConfig();
const missingEnv = validateServerEnv(config);

if (missingEnv.length > 0) {
  console.warn(
    `Missing required environment variables for this deployment: ${missingEnv.join(", ")}`,
  );
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = new Set(config.corsAllowedOrigins);
      const isLocalhost =
        origin.includes("localhost") || origin.includes("127.0.0.1");

      if (allowedOrigins.has(origin) || isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Cognitive Persona Engine Evaluation Endpoint
app.post("/api/evaluate", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Text content is required for evaluation." });
    }

    if (!config.watsonxApiKey || !config.watsonxProjectId) {
      throw new Error(
        "WATSONX_API_KEY and WATSONX_PROJECT_ID environment variables must be configured.",
      );
    }

    const evaluationData = await evaluateTextWithWatsonx(
      text,
      config.watsonxApiKey,
      config.watsonxProjectId,
      config.watsonxServiceUrl,
    );
    res.json(evaluationData);
  } catch (error: unknown) {
    console.error("Cognitive Mirror Evaluation Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during cognitive persona analysis.";

    res.status(500).json({
      error: message,
      details: "IBM watsonx.ai request could not be completed.",
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const port = config.port;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Cognitive Mirror server running on http://0.0.0.0:${port}`);
  });
}

startServer();
