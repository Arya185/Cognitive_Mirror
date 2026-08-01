import dotenv from "dotenv";

dotenv.config({ quiet: true });

type NodeEnv = "development" | "production" | "test";

export interface ServerConfig {
  nodeEnv: NodeEnv;
  port: number;
  corsAllowedOrigins: string[];
  openRouterApiKey?: string;
  apiBaseUrl?: string;
}

function normalizeNodeEnv(value: string | undefined): NodeEnv {
  if (value === "production" || value === "test") return value;
  return "development";
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "3000");
  return Number.isInteger(port) && port > 0 ? port : 3000;
}

function parseCorsOrigins(
  value: string | undefined,
  nodeEnv: NodeEnv,
): string[] {
  const configuredOrigins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  if (nodeEnv !== "production") {
    configuredOrigins.push(...devOrigins);
  }

  return Array.from(new Set(configuredOrigins));
}

export function getServerConfig(): ServerConfig {
  const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);

  return {
    nodeEnv,
    port: parsePort(process.env.PORT),
    corsAllowedOrigins: parseCorsOrigins(
      process.env.CORS_ALLOWED_ORIGINS,
      nodeEnv,
    ),
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    apiBaseUrl: process.env.VITE_API_BASE_URL?.replace(/\/$/, ""),
  };
}

export function validateServerEnv(config: ServerConfig): string[] {
  const missing: string[] = [];

  if (!config.openRouterApiKey) {
    missing.push("OPENROUTER_API_KEY");
  }

  return missing;
}