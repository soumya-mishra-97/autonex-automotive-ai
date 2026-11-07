import { z } from "zod";
import { documentSchema, healthSchema, vehicleSchema } from "../domain/models";
import type { AgentRepository, ServiceRepository, VehicleRepository } from "../domain/ports";
import { ApiAgentRepository, ApiClient, ApiServiceRepository, ApiVehicleRepository } from "./api";

interface Options {
  baseUrl?: string;
  mode?: "auto" | "demo";
  fetcher?: typeof fetch;
  storage?: Pick<Storage, "getItem" | "setItem">;
  connectTimeoutMs?: number;
}
interface Repositories {
  vehicles: VehicleRepository;
  agent: AgentRepository;
  service: ServiceRepository;
}

/** Choose once at startup. Never replay a failed backend write against a different adapter. */
export function createWorkspaceRepositories(options: Options = {}): Repositories {
  const api = new ApiClient(options.baseUrl, options.fetcher);
  let selected: Promise<Repositories> | undefined;
  const initialize = async (): Promise<Repositories> => {
    if (options.mode !== "demo") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.connectTimeoutMs ?? 2500);
      try {
        const [catalog, health, documents] = await Promise.all([
          api.request("/vehicles", z.array(vehicleSchema).min(1), undefined, controller.signal),
          api.request("/health", healthSchema, undefined, controller.signal),
          api.request("/knowledge", z.array(documentSchema), undefined, controller.signal),
        ]);
        const vehicles = new ApiVehicleRepository(api);
        const agent = new ApiAgentRepository(api);
        return {
          vehicles: {
            list: async () => structuredClone(catalog),
            quote: (input) => vehicles.quote(input),
            requestTestDrive: (input) => vehicles.requestTestDrive(input),
          },
          agent: {
            health: async () => health,
            documents: async () => structuredClone(documents),
            run: (input, onStep) => agent.run(input, onStep),
            operations: (signal) => agent.operations(signal),
            downloadReport: (run) => agent.downloadReport(run),
          },
          service: new ApiServiceRepository(api),
        };
      } catch {
        /* Any failed startup resource selects a complete browser demo, not an empty UI. */
      } finally {
        clearTimeout(timeout);
        controller.abort();
      }
    }
    const { BrowserWorkspace } = await import("./demo/BrowserWorkspace");
    const browser = new BrowserWorkspace(options.storage);
    return { vehicles: browser.vehicles, agent: browser.agent, service: browser.service };
  };
  const ready = () => (selected ??= initialize());
  return {
    vehicles: {
      list: async () => (await ready()).vehicles.list(),
      quote: async (input) => (await ready()).vehicles.quote(input),
      requestTestDrive: async (input) => (await ready()).vehicles.requestTestDrive(input),
    },
    agent: {
      health: async () => (await ready()).agent.health(),
      documents: async () => (await ready()).agent.documents(),
      run: async (input, onStep) => (await ready()).agent.run(input, onStep),
      operations: async (signal) => (await ready()).agent.operations(signal),
      recentRuns: async () => (await ready()).agent.recentRuns?.() ?? [],
      downloadReport: async (run) => (await ready()).agent.downloadReport(run),
    },
    service: {
      centers: async (query) => (await ready()).service.centers(query),
      simulate: async (vehicle, service) => (await ready()).service.simulate(vehicle, service),
    },
  };
}
