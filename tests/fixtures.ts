import { z } from "zod";
import catalog from "../backend/data/vehicles.json";
import { defaultConfiguration, vehicleSchema } from "../frontend/src/domain/models";
import type { AgentRun, Configuration, Health, Quote } from "../frontend/src/domain/models";
import type { AgentRepository, VehicleRepository } from "../frontend/src/domain/ports";

export const vehicles = z.array(vehicleSchema).parse(catalog);
export const vehicle = vehicles[0]!;
export const configuration = defaultConfiguration(vehicle);
export function makeQuote(config: Configuration = configuration, total = 58900): Quote {
  return {
    configuration: config,
    lines: [{ label: "Comfort", amount: total }],
    total,
    currency: "USD",
  };
}
export const health: Health = {
  status: "ok",
  mode: "demo",
  model: "Demo",
  retrieval: "lexical",
  mcp: "available",
  transport: "api",
};
export const run: AgentRun = {
  id: "run-one",
  created_at: "2026-11-06T00:00:00Z",
  mode: "demo",
  prompt: "A sporty blue car",
  summary: "BMW i4 Performance",
  rationale: "Suited to your daily drive.",
  quote: makeQuote(),
  sources: [],
  trace: [],
  warnings: [],
  needs_clarification: false,
};
export function repositories(): { vehicles: VehicleRepository; agent: AgentRepository } {
  return {
    vehicles: {
      list: async () => vehicles,
      quote: async (config) => makeQuote(config),
      requestTestDrive: async () => ({ id: "lead-1", status: "requested" }),
    },
    agent: {
      health: async () => health,
      run: async () => run,
      documents: async () => [],
      downloadReport: async () => {},
      operations: async () => ({
        total: 0,
        successful: 0,
        failed: 0,
        retries: 0,
        latency_ms: 0,
        tokens: 0,
        mcp_calls: 0,
        recent: [],
      }),
    },
  };
}
