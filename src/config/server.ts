import dotenv from "dotenv";

dotenv.config({ quiet: true });

type NodeEnv = "development" | "production" | "test";

export interface ServerConfig {
  nodeEnv: NodeEnv;
  port: number;
  corsAllowedOrigins: string[];
  watsonxApiKey?: string;
  watsonxProjectId?: string;
  watsonxServiceUrl: string;
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
    watsonxApiKey: process.env.WATSONX_API_KEY,
    watsonxProjectId: process.env.WATSONX_PROJECT_ID,
    watsonxServiceUrl:
      process.env.WATSONX_SERVICE_URL ?? "https://eu-de.ml.cloud.ibm.com",
    apiBaseUrl: process.env.VITE_API_BASE_URL?.replace(/\/$/, ""),
  };
}

export function validateServerEnv(config: ServerConfig): string[] {
  const missing: string[] = [];

  if (!config.watsonxApiKey) {
    missing.push("WATSONX_API_KEY");
  }

  if (!config.watsonxProjectId) {
    missing.push("WATSONX_PROJECT_ID");
  }

  return missing;
}
