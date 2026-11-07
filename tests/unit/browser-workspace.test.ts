import { describe, expect, it, vi } from "vitest";
import { BrowserWorkspace } from "../../frontend/src/infrastructure/demo/BrowserWorkspace";
import { createWorkspaceRepositories } from "../../frontend/src/infrastructure/workspace";
import { createShowroomStore } from "../../frontend/src/application/showroom";
import { configuration, health, vehicles } from "../fixtures";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("browser workspace", () => {
  it("runs a complete sourced recommendation, preserves it on reload and records only real local activity", async () => {
    const storage = memoryStorage();
    const browser = new BrowserWorkspace(storage);
    const steps: string[] = [];
    const run = await browser.agent.run(
      { prompt: "A sporty blue car under $75k", vehicle_id: null, history: [] },
      (step) => steps.push(step.node),
    );
    expect(run.summary).toBe("Meet your BMW i4 Performance.");
    expect(run.quote.total).toBe(68900);
    expect(steps).toEqual([
      "master",
      "understanding",
      "research",
      "specialist",
      "tools",
      "validation",
      "synthesis",
    ]);
    expect(run.sources.length).toBeGreaterThan(0);
    const recreated = new BrowserWorkspace(storage);
    expect(await recreated.agent.recentRuns?.()).toEqual([run]);
    expect(await recreated.agent.operations()).toMatchObject({
      total: 1,
      successful: 1,
      failed: 0,
      tokens: 0,
      mcp_calls: 0,
      retries: 0,
    });
    expect(await recreated.agent.health()).toMatchObject({
      transport: "browser",
      mcp: "mock",
      mode: "demo",
    });
  });
  it("validates configurations and consent while keeping service requests virtual", async () => {
    const browser = new BrowserWorkspace();
    expect(
      browser.quote({ ...configuration, trim_id: "trim-performance", color_id: "color-jet-black" })
        .total,
    ).toBe(69800);
    expect(() => browser.quote({ ...configuration, trim_id: "invented" })).toThrow();
    expect(() =>
      browser.quote({ ...configuration, package_ids: ["package-comfort", "package-comfort"] }),
    ).toThrow("only be selected once");
    await expect(
      browser.vehicles.requestTestDrive({
        vehicle_id: "bmw-i4-demo",
        name: "Alex",
        email: "invalid",
        preferred_date: "2099-01-15",
        consent: true,
      }),
    ).rejects.toThrow();
    await expect(
      browser.vehicles.requestTestDrive({
        vehicle_id: "bmw-i4-demo",
        name: "Alex",
        email: "alex@example.com",
        preferred_date: "2099-01-15",
        consent: true,
      }),
    ).resolves.toMatchObject({ status: "requested" });
    expect(await browser.service.centers("nearby")).toMatchObject({
      demo: true,
      centers: [{ location: "Virtual only" }],
    });
    expect(await browser.service.simulate("bmw-i4-demo", "Maintenance")).toMatchObject({
      status: "simulated",
      booking_created: false,
    });
  });
  it("remains usable without storage and asks for clarification instead of inventing an answer", async () => {
    const browser = new BrowserWorkspace({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(await browser.vehicles.list()).toHaveLength(3);
    const run = await browser.agent.run({ prompt: "Help", history: [], vehicle_id: null });
    expect(run.needs_clarification).toBe(true);
    expect(run.sources).toEqual([]);
  });
});

describe("workspace initialization", () => {
  it("shows the complete local workspace when the API is offline", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const repositories = createWorkspaceRepositories({ fetcher });
    const store = createShowroomStore(repositories.vehicles, repositories.agent);
    await store.getState().load();
    expect(store.getState()).toMatchObject({
      loading: false,
      error: null,
      health: { transport: "browser" },
    });
    expect(store.getState().vehicles).toHaveLength(3);
    expect(store.getState().documents).toHaveLength(4);
    expect(store.getState().quote?.total).toBe(89900);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await store.getState().ask("A sporty blue car under $75k");
    expect(store.getState().runs).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("uses the backend when all startup resources are valid", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const path = String(input);
      return new Response(
        JSON.stringify(
          path.endsWith("/health") ? health : path.endsWith("/vehicles") ? vehicles : [],
        ),
      );
    });
    const repositories = createWorkspaceRepositories({ fetcher });
    expect(await repositories.agent.health()).toMatchObject({ transport: "api" });
    expect(await repositories.vehicles.list()).toEqual(vehicles);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("uses one coherent local adapter if a reachable backend returns an invalid catalog", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]"));
    const repositories = createWorkspaceRepositories({ fetcher });
    expect(await repositories.vehicles.list()).toHaveLength(3);
    expect(await repositories.agent.health()).toMatchObject({ transport: "browser" });
    expect(await repositories.service.simulate("bmw-i4-demo", "Inspection")).toMatchObject({
      booking_created: false,
    });
  });
  it("allows explicit demo mode without making any network requests", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const repositories = createWorkspaceRepositories({ mode: "demo", fetcher });
    expect(await repositories.vehicles.list()).toHaveLength(3);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("connection failure boundaries", () => {
  it("bounds startup time when a backend never responds", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Timed out", "AbortError")),
            { once: true },
          );
        }),
    );
    const workspace = createWorkspaceRepositories({ fetcher, connectTimeoutMs: 10 });
    expect(await workspace.agent.health()).toMatchObject({ transport: "browser" });
  });
  it("does not silently replay a failed backend write as a browser action", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
      if (init?.method === "POST") throw new TypeError("connection lost");
      const path = String(input);
      return new Response(
        JSON.stringify(
          path.endsWith("/health") ? health : path.endsWith("/vehicles") ? vehicles : [],
        ),
      );
    });
    const workspace = createWorkspaceRepositories({ fetcher });
    await workspace.agent.health();
    await expect(
      workspace.vehicles.requestTestDrive({
        vehicle_id: "bmw-i4-demo",
        name: "Alex",
        email: "alex@example.com",
        preferred_date: "2099-01-15",
        consent: true,
      }),
    ).rejects.toThrow("Cannot reach");
    expect(await workspace.agent.health()).toMatchObject({ transport: "api" });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

describe("XUV demonstration model", () => {
  it("opens on the XUV regardless of catalog order and supports switching between models", async () => {
    const browser = new BrowserWorkspace();
    const store = createShowroomStore(browser.vehicles, browser.agent);
    await store.getState().load();
    expect(store.getState().configuration?.vehicle_id).toBe("autonex-xuv-demo");
    expect(store.getState().quote?.total).toBe(89900);
    store.getState().selectVehicle("bmw-i4-demo");
    expect(store.getState().configuration?.vehicle_id).toBe("bmw-i4-demo");
    store.getState().selectVehicle("autonex-xuv-demo");
    expect(store.getState().configuration).toMatchObject({
      vehicle_id: "autonex-xuv-demo",
      trim_id: "trim-adventure",
    });
  });
  it("routes G-Wagon and XUV prompts to the new fixture with correctly scoped citations", async () => {
    const browser = new BrowserWorkspace();
    const run = await browser.agent.run({
      prompt: "A fast black G-Wagon-inspired XUV under $150k",
      history: [],
      vehicle_id: null,
    });
    expect(run.quote.configuration.vehicle_id).toBe("autonex-xuv-demo");
    expect(run.quote.total).toBe(110800);
    expect(run.sources.some((source) => source.document_id === "xuv")).toBe(true);
    expect(
      run.sources.every(
        (source) => source.document_id === "xuv" || source.document_id === "ownership",
      ),
    ).toBe(true);
    const followup = await browser.agent.run({
      prompt: "Switch to a BMW i4",
      history: [{ role: "user", content: "Show the XUV" }],
      vehicle_id: null,
    });
    expect(followup.quote.configuration.vehicle_id).toBe("bmw-i4-demo");
  });
});
