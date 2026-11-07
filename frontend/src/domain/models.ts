import { z } from "zod";

const optionSchema = z.object({
  id: z.string(),
  name: z.string(),
  price_delta: z.number().int().nonnegative(),
});
export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  summary: z.string(),
  body_type: z.string(),
  is_default: z.boolean().default(false),
  range_miles: z.number(),
  charge_time_10to80_min: z.number(),
  trims: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        base_price: z.number(),
        horsepower: z.number(),
        zero_to_sixty: z.number(),
        drivetrain: z.string(),
        description: z.string(),
      }),
    )
    .min(1),
  colors: z.array(optionSchema.extend({ hex: z.string() })).min(1),
  wheels: z.array(optionSchema).min(1),
  interiors: z.array(optionSchema).min(1),
  packages: z.array(optionSchema.extend({ description: z.string() })),
  reference_specifications: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        variant: z.string(),
        source_url: z.string().startsWith("https://"),
        published_at: z.string(),
        note: z.string(),
      }),
    )
    .default([]),
});
export const configurationSchema = z.object({
  vehicle_id: z.string(),
  trim_id: z.string(),
  color_id: z.string(),
  wheel_id: z.string(),
  interior_id: z.string(),
  package_ids: z.array(z.string()),
});
export const quoteSchema = z.object({
  configuration: configurationSchema,
  lines: z.array(z.object({ label: z.string(), amount: z.number().int() })),
  total: z.number().int(),
  currency: z.literal("USD"),
});
export const sourceSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  version: z.string().default("1"),
  url: z.string().startsWith("https://").nullable().default(null),
});
export const traceStepSchema = z.object({
  node: z.string(),
  label: z.string(),
  detail: z.string(),
  duration_ms: z.number(),
  retries: z.number().default(0),
});
export type TraceStep = z.infer<typeof traceStepSchema>;
export const operationsSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  retries: z.number(),
  latency_ms: z.number(),
  tokens: z.number(),
  mcp_calls: z.number(),
  recent: z.array(
    z.object({
      id: z.string(),
      created_at: z.string(),
      status: z.string(),
      duration_ms: z.number(),
      prompt: z.string(),
      retries: z.number(),
      tokens: z.number(),
    }),
  ),
});
export type OperationsData = z.infer<typeof operationsSchema>;
export const runSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  mode: z.enum(["demo", "live"]),
  prompt: z.string(),
  summary: z.string(),
  rationale: z.string(),
  quote: quoteSchema,
  sources: z.array(sourceSchema),
  trace: z.array(traceStepSchema),
  warnings: z.array(z.string()),
  needs_clarification: z.boolean().default(false),
});
export const healthSchema = z.object({
  status: z.literal("ok"),
  mode: z.enum(["demo", "live"]),
  model: z.string(),
  retrieval: z.enum(["lexical", "semantic", "hybrid"]),
  mcp: z.enum(["available", "mock"]),
  transport: z.enum(["api", "browser"]).default("api"),
});
export const documentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  vehicle_id: z.string().nullable(),
  version: z.string().default("1"),
  url: z.string().startsWith("https://").nullable().default(null),
});
export const receiptSchema = z.object({ id: z.string(), status: z.literal("requested") });
export type Vehicle = z.infer<typeof vehicleSchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type AgentRun = z.infer<typeof runSchema>;
export type Health = z.infer<typeof healthSchema>;
export type KnowledgeDocument = z.infer<typeof documentSchema>;
export type TestDriveReceipt = z.infer<typeof receiptSchema>;
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface RunRequest {
  prompt: string;
  vehicle_id: string | null;
  history: ChatMessage[];
}
export interface TestDriveRequest {
  vehicle_id: string;
  name: string;
  email: string;
  preferred_date: string;
  consent: true;
}

export function defaultConfiguration(vehicle: Vehicle): Configuration {
  const trim = vehicle.trims[0];
  const color = vehicle.colors[0];
  const wheel = vehicle.wheels[0];
  const interior = vehicle.interiors[0];
  if (!trim || !color || !wheel || !interior) throw new Error("The vehicle catalog is incomplete.");
  return {
    vehicle_id: vehicle.id,
    trim_id: trim.id,
    color_id: color.id,
    wheel_id: wheel.id,
    interior_id: interior.id,
    package_ids: [],
  };
}

export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

export const serviceCentersSchema = z.object({
  demo: z.literal(true),
  query: z.string(),
  centers: z.array(z.object({ id: z.string(), name: z.string(), location: z.string() })),
});
export const serviceReceiptSchema = z.object({
  demo: z.literal(true),
  status: z.literal("simulated"),
  vehicle_id: z.string(),
  service: z.string(),
  booking_created: z.literal(false),
});
export type ServiceCenters = z.infer<typeof serviceCentersSchema>;
export type ServiceReceipt = z.infer<typeof serviceReceiptSchema>;
