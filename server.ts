import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { getServerConfig, validateServerEnv } from "./src/config/server.js";
import { evaluateText } from "./src/lib/ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const config = getServerConfig();

// Validate required environment variables
const missingEnv = validateServerEnv(config);

if (missingEnv.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// ---------- CORS ----------
const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isLocalhost =
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("0.0.0.0");

      if (allowedOrigins.has(origin) || isLocalhost) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ---------- Health ----------
app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ---------- AI Evaluation ----------
app.post("/api/evaluate", async (req, res) => {
  try {
    const { text } = req.body;

    if (typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        error: "Text content is required for evaluation.",
      });
    }

    const result = await evaluateText(text);

    res.json(result);
  } catch (error) {
    console.error("Evaluation Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unexpected AI evaluation error.";

    res.status(500).json({
      error: message,
      details: "OpenRouter inference request failed.",
    });
  }
});

// ---------- Static / Vite ----------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");

    const vite = await createServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(config.port, "0.0.0.0", () => {
    console.log(
      `🚀 Cognitive Mirror running on http://0.0.0.0:${config.port}`
    );
  });
}

startServer();