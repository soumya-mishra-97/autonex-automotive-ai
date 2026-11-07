import { z } from "zod";
import { saveDownload } from "./download";
import {
  documentSchema,
  healthSchema,
  operationsSchema,
  quoteSchema,
  receiptSchema,
  runSchema,
  traceStepSchema,
  vehicleSchema,
  serviceCentersSchema,
  serviceReceiptSchema,
} from "../domain/models";
import type {
  AgentRun,
  Configuration,
  RunRequest,
  TestDriveRequest,
  TraceStep,
} from "../domain/models";
import type { AgentRepository, VehicleRepository, ServiceRepository } from "../domain/ports";

export class ApiClient {
  constructor(
    private readonly baseUrl = "/api/v1",
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async stream(request: RunRequest, onStep?: (step: TraceStep) => void): Promise<AgentRun> {
    const fetcher = this.fetcher;
    const response = await fetcher(`${this.baseUrl}/agent/runs/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok || !response.body)
      throw new Error("The workflow could not start. Please retry.");
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let result: AgentRun | null = null;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let boundary: number;
        while ((boundary = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 1);
          if (!line.trim()) continue;
          const event = z
            .object({ type: z.enum(["step", "result", "error"]), data: z.unknown() })
            .parse(JSON.parse(line));
          if (event.type === "step") onStep?.(traceStepSchema.parse(event.data));
          if (event.type === "result") result = runSchema.parse(event.data);
          if (event.type === "error") throw new Error(z.string().parse(event.data));
        }
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    if (!result) throw new Error("The workflow ended before a response was received.");
    return result;
  }

  async download(path: string, filename: string): Promise<void> {
    const fetcher = this.fetcher;
    const response = await fetcher(`${this.baseUrl}${path}`, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf"))
      throw new Error("The PDF report could not be downloaded. Please retry.");
    saveDownload(await response.blob(), filename);
  }

  async request<T>(
    path: string,
    schema: z.ZodType<T>,
    body?: object,
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response;
    try {
      const fetcher = this.fetcher;
      response = await fetcher(`${this.baseUrl}${path}`, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(120_000)])
          : AbortSignal.timeout(120_000),
      });
    } catch {
      throw new Error("Cannot reach the AUTONEX API. Start the Python backend and retry.");
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = z.object({ detail: z.string() }).safeParse(data);
      throw new Error(
        parsed.success
          ? parsed.data.detail
          : "The request could not be completed. Please check your details and retry.",
      );
    }
    const result = schema.safeParse(data);
    if (!result.success) throw new Error("The API returned an unexpected response. Please retry.");
    return result.data;
  }
}

export class ApiVehicleRepository implements VehicleRepository {
  constructor(private readonly api: ApiClient) {}
  list() {
    return this.api.request("/vehicles", z.array(vehicleSchema));
  }
  quote(configuration: Configuration) {
    return this.api.request("/quotes", quoteSchema, configuration);
  }
  requestTestDrive(request: TestDriveRequest) {
    return this.api.request("/test-drives", receiptSchema, request);
  }
}
export class ApiAgentRepository implements AgentRepository {
  constructor(private readonly api: ApiClient) {}
  health() {
    return this.api.request("/health", healthSchema);
  }
  run(request: RunRequest, onStep?: (step: TraceStep) => void) {
    return this.api.stream(request, onStep);
  }
  documents() {
    return this.api.request("/knowledge", z.array(documentSchema));
  }
  downloadReport(run: AgentRun) {
    return this.api.download(
      `/agent/runs/${encodeURIComponent(run.id)}/report`,
      `autonex-${run.id}.pdf`,
    );
  }
  operations(signal?: AbortSignal) {
    return this.api.request("/operations", operationsSchema, undefined, signal);
  }
}

export class ApiServiceRepository implements ServiceRepository {
  constructor(private readonly api: ApiClient) {}
  centers(query: string) {
    return this.api.request("/service-centers/search", serviceCentersSchema, { query });
  }
  simulate(vehicleId: string, service: string) {
    return this.api.request("/service-requests/demo", serviceReceiptSchema, {
      vehicle_id: vehicleId,
      service,
    });
  }
}
