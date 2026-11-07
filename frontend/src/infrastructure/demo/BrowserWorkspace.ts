import { z } from "zod";
import catalogData from "../../../../backend/data/vehicles.json";
import gtText from "../../../../backend/knowledge/gt.md?raw";
import xuvText from "../../../../backend/knowledge/xuv.md?raw";
import suvText from "../../../../backend/knowledge/suv.md?raw";
import ownershipText from "../../../../backend/knowledge/ownership.md?raw";
import {
  defaultConfiguration,
  configurationSchema,
  operationsSchema,
  runSchema,
  vehicleSchema,
} from "../../domain/models";
import type {
  AgentRun,
  Configuration,
  Health,
  KnowledgeDocument,
  OperationsData,
  Quote,
  RunRequest,
  ServiceCenters,
  ServiceReceipt,
  TestDriveReceipt,
  TestDriveRequest,
  TraceStep,
  Vehicle,
} from "../../domain/models";
import type { AgentRepository, ServiceRepository, VehicleRepository } from "../../domain/ports";

const STORAGE_KEY = "autonex-browser-workspace-v1";
const MAX_RECORDS = 50;
const emptyOperations = (): OperationsData => ({
  total: 0,
  successful: 0,
  failed: 0,
  retries: 0,
  latency_ms: 0,
  tokens: 0,
  mcp_calls: 0,
  recent: [],
});
const savedSchema = z.object({
  runs: z.array(runSchema).max(MAX_RECORDS),
  operations: operationsSchema,
});
type Saved = z.infer<typeof savedSchema>;
const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(
        (word) =>
          word.length > 2 &&
          !["the", "and", "for", "with", "about", "can", "you", "car", "vehicle"].includes(word),
      ) ?? [],
  );
function version(content: string) {
  let hash = 2166136261;
  for (const character of content) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `browser-${(hash >>> 0).toString(16)}`;
}

/** Offline adapter: all data access stays behind the same repository ports. No LLM or MCP calls. */
export class BrowserWorkspace {
  private readonly catalog = z.array(vehicleSchema).parse(catalogData);
  private readonly documents: KnowledgeDocument[] = [
    {
      id: "gt",
      title: gtText.split("\n")[0]!.replace(/^# /, ""),
      content: gtText,
      vehicle_id: "bmw-i4-demo",
      version: version(gtText),
      url: "https://newsroom.bmwgroup.com/americas/2026-bmw-i4-update-measures",
    },
    {
      id: "suv",
      title: suvText.split("\n")[0]!.replace(/^# /, ""),
      content: suvText,
      vehicle_id: "bmw-ix-demo",
      version: version(suvText),
      url: "https://newsroom.bmwgroup.com/americas/the-new-bmw-ix",
    },
    {
      id: "xuv",
      title: xuvText.split("\n")[0]!.replace(/^# /, ""),
      content: xuvText,
      vehicle_id: "autonex-xuv-demo",
      version: version(xuvText),
      url: null,
    },
    {
      id: "ownership",
      title: ownershipText.split("\n")[0]!.replace(/^# /, ""),
      content: ownershipText,
      vehicle_id: null,
      version: version(ownershipText),
      url: null,
    },
  ];
  private saved: Saved;
  readonly health: Health = {
    status: "ok",
    mode: "demo",
    model: "Browser demo rules · No LLM",
    retrieval: "lexical",
    mcp: "mock",
    transport: "browser",
  };

  constructor(private readonly storage?: Pick<Storage, "getItem" | "setItem">) {
    this.saved = { runs: [], operations: emptyOperations() };
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) this.saved = savedSchema.parse(JSON.parse(raw));
    } catch {
      /* Corrupt or unavailable device storage never blocks the workspace. */
    }
  }
  private persist() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    } catch {
      /* Memory-only demo remains functional when storage is unavailable/full. */
    }
  }
  private vehicle(id: string): Vehicle {
    const vehicle = this.catalog.find((item) => item.id === id);
    if (!vehicle) throw new Error("Choose a vehicle from the demonstration catalog.");
    return vehicle;
  }
  quote(input: Configuration): Quote {
    const configuration = configurationSchema.parse(input);
    const vehicle = this.vehicle(configuration.vehicle_id);
    const trim = vehicle.trims.find((item) => item.id === configuration.trim_id);
    if (!trim) throw new Error("Choose a valid demonstration trim.");
    if (new Set(configuration.package_ids).size !== configuration.package_ids.length)
      throw new Error("A package can only be selected once.");
    const lines = [{ label: trim.name, amount: trim.base_price }];
    const add = (options: { id: string; name: string; price_delta: number }[], id: string) => {
      const option = options.find((item) => item.id === id);
      if (!option) throw new Error("This option is not available for the selected vehicle.");
      lines.push({ label: option.name, amount: option.price_delta });
    };
    add(vehicle.colors, configuration.color_id);
    add(vehicle.wheels, configuration.wheel_id);
    add(vehicle.interiors, configuration.interior_id);
    configuration.package_ids.forEach((id) => add(vehicle.packages, id));
    return {
      configuration,
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      currency: "USD",
    };
  }
  private sources(query: string, vehicleId: string | null): AgentRun["sources"] {
    const queryWords = words(query);
    return this.documents
      .filter((doc) => !vehicleId || !doc.vehicle_id || doc.vehicle_id === vehicleId)
      .flatMap((doc) =>
        doc.content.split(/(?=^## )/m).flatMap((section, sectionIndex) => {
          const heading = section.split("\n")[0]!.replace(/^#+ /, "");
          return Array.from({ length: Math.ceil(section.length / 600) }, (_, index) => {
            const excerpt = section.slice(index * 600, index * 600 + 700);
            return {
              id: `${doc.id}-${doc.version}-${sectionIndex}-${index}`,
              document_id: doc.id,
              title: `${doc.title} / ${heading}`,
              excerpt,
              version: doc.version,
              url: heading === "Public BMW reference notes" ? doc.url : null,
            };
          });
        }),
      )
      .map((source) => ({
        source,
        score: [...words(source.excerpt)].filter((word) => queryWords.has(word)).length,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.source);
  }
  private record(id: string, prompt: string, started: number, status: "successful" | "failed") {
    const previous = this.saved.operations;
    const duration_ms = Math.max(0, Math.round(performance.now() - started));
    this.saved.operations = {
      ...previous,
      total: previous.total + 1,
      successful: previous.successful + Number(status === "successful"),
      failed: previous.failed + Number(status === "failed"),
      latency_ms: (previous.latency_ms * previous.total + duration_ms) / (previous.total + 1),
      recent: [
        {
          id,
          prompt,
          status,
          duration_ms,
          created_at: new Date().toISOString(),
          retries: 0,
          tokens: 0,
        },
        ...previous.recent,
      ].slice(0, MAX_RECORDS),
    };
    this.persist();
  }
  async run(request: RunRequest, onStep?: (step: TraceStep) => void): Promise<AgentRun> {
    const started = performance.now();
    const id = crypto.randomUUID();
    const trace: TraceStep[] = [];
    const emit = async (node: string, label: string, detail: string, began: number) => {
      const item = {
        node,
        label,
        detail,
        duration_ms: Math.max(0, Math.round(performance.now() - began)),
        retries: 0,
      };
      trace.push(item);
      onStep?.(item);
      // Yield to the browser between completed local tasks so progress can paint.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    try {
      if (request.prompt.trim().length < 3 || request.prompt.length > 4000)
        throw new Error("Describe your needs in 3–4000 characters.");
      await emit(
        "master",
        "Master orchestrator",
        "Started the browser demonstration workflow. No LangGraph server or LLM is called.",
        started,
      );
      let began = performance.now();
      const text = [
        ...request.history.filter((item) => item.role === "user").map((item) => item.content),
        request.prompt,
      ]
        .join(" ")
        .toLowerCase();
      const current = request.prompt.toLowerCase();
      const clarification = /^(help|hello|hey|tell me|car|vehicle)[.!? ]*$/.test(current.trim());
      const comparison = /compare|comparison|versus|\bvs\b/.test(current);
      const knowledge = /explain|guide|charging|manual|feature|range|power/.test(current);
      const service = /service|book|dealer|appointment/.test(current);
      const modelMatches = [
        ...text.matchAll(/\bi4\b|\bix\b|\bxuv\b|g[ -]?(?:wagon|class)|\bboxy\b|off[ -]?road/g),
      ];
      const entity = modelMatches.at(-1)?.[0];
      const vehicleId =
        entity && /xuv|g[ -]?(?:wagon|class)|boxy|off[ -]?road/.test(entity)
          ? "autonex-xuv-demo"
          : entity === "ix" || (!entity && /suv|family/.test(text))
            ? "bmw-ix-demo"
            : "bmw-i4-demo";
      const vehicle = this.vehicle(request.vehicle_id ?? vehicleId);
      const performancePreference = /sport|fast|track|performance/.test(text);
      const comfort = /family|comfort|commut|daily/.test(text);
      const budgetMatch = [
        ...text.matchAll(/(?:under|budget|up to|below|\$)\s*\$?([\d,]+(?:\.\d+)?)\s*(k)?/g),
      ].at(-1);
      const budget = budgetMatch
        ? Number(budgetMatch[1]!.replaceAll(",", "")) * (budgetMatch[2] ? 1000 : 1)
        : null;
      await emit(
        "understanding",
        "Question understanding agent",
        `Classified ${clarification ? "clarification" : comparison ? "comparison" : knowledge ? "knowledge" : service ? "service demonstration" : "configuration"}; selected ${vehicle.name}.`,
        began,
      );
      began = performance.now();
      const sources = this.sources(request.prompt, comparison ? null : vehicle.id);
      await emit(
        "research",
        "Knowledge retrieval",
        `Matched ${sources.length} bundled document sections using local lexical search.`,
        began,
      );
      began = performance.now();
      let configuration = defaultConfiguration(vehicle);
      const colorMatch = [...text.matchAll(/\b(blue|white|black|grey|gray|burgundy)\b/g)]
        .at(-1)?.[1]
        ?.replace("gray", "grey");
      const color = vehicle.colors.find(
        (item) => colorMatch && item.name.toLowerCase().includes(colorMatch),
      );
      configuration = {
        ...configuration,
        color_id: color?.id ?? configuration.color_id,
        trim_id: (performancePreference ? vehicle.trims[1] : vehicle.trims[0])!.id,
        package_ids:
          comfort && !performancePreference
            ? vehicle.packages
                .filter((item) => /comfort|family/.test(item.id))
                .map((item) => item.id)
            : [],
      };
      if (budget && this.quote(configuration).total > budget)
        configuration = { ...defaultConfiguration(vehicle), color_id: configuration.color_id };
      if (budget && this.quote(configuration).total > budget)
        configuration = defaultConfiguration(vehicle);
      await emit(
        "specialist",
        "Vehicle intelligence agent",
        `Selected and compared valid ${vehicle.name} demonstration options. Published BMW reference values remain separate.`,
        began,
      );
      began = performance.now();
      const quote = this.quote(configuration);
      await emit(
        "tools",
        "Local demo tool agent",
        "Calculated the local demonstration estimate. No MCP server, booking, or manufacturer API was called.",
        began,
      );
      began = performance.now();
      if (quote.total !== quote.lines.reduce((sum, item) => sum + item.amount, 0))
        throw new Error("The estimate could not be validated.");
      await emit(
        "validation",
        "Validation agent",
        "Validated catalog option IDs, price arithmetic, and bundled source references.",
        began,
      );
      began = performance.now();
      const trim = vehicle.trims.find((item) => item.id === configuration.trim_id)!;
      const summary = clarification
        ? "LET’S FIND THE RIGHT DIRECTION."
        : comparison
          ? "AUTOMOTIVE VEHICLE INTELLIGENCE COMPARISON"
          : knowledge
            ? "YOUR VEHICLE KNOWLEDGE SUMMARY"
            : service
              ? "SERVICE DEMONSTRATION GUIDANCE"
              : `Meet your ${vehicle.name} ${trim.name}.`;
      const rationale = clarification
        ? "Would you like to compare models, explore a vehicle, learn about charging, or preview a service request? Tell me which model and what matters to you."
        : comparison
          ? this.catalog
              .map(
                (item) =>
                  `${item.name}: illustrative range ${item.range_miles} mi, base power ${item.trims[0]!.horsepower} hp, and base 0–60 mph ${item.trims[0]!.zero_to_sixty} s. Published reference: ${item.reference_specifications.map((spec) => `${spec.variant}, ${spec.label} ${spec.value}`).join("; ") || "No manufacturer reference; AUTONEX demonstration fixture"}.`,
              )
              .join(" ")
          : service
            ? "Open SERVICE DEMO to search the bundled virtual center and simulate a request. No appointment is created and no dealer is contacted."
            : knowledge
              ? (sources[0]?.excerpt ??
                "Insufficient evidence in the bundled documents. Please specify the model year, region and feature.")
              : `${trim.description} This recommendation uses the selected paint preference and validated demonstration options. Compare the other trims before deciding. It was produced by browser demo rules, not an LLM.`;
      await emit(
        "synthesis",
        "Response synthesis",
        "Prepared a demonstration response with available source excerpts and clear limitations.",
        began,
      );
      const warnings = [
        "Browser-only demonstration: no LLM, LangGraph server, live MCP connection, or manufacturer system access.",
        "All configurable prices, options and numeric specifications are illustrative AUTONEX fixtures. No official manufacturer affiliation.",
      ];
      if (!sources.length)
        warnings.push(
          "Insufficient retrieved evidence. Verify important details with an authorized source.",
        );
      if (budget && quote.total > budget)
        warnings.push(
          "This configuration exceeds your stated budget. No within-budget configuration is available in this demo catalog.",
        );
      const result = runSchema.parse({
        id,
        created_at: new Date().toISOString(),
        mode: "demo",
        prompt: request.prompt,
        summary,
        rationale,
        quote,
        sources: clarification ? [] : sources,
        trace,
        warnings,
        needs_clarification: clarification,
      });
      this.saved.runs = [...this.saved.runs, result].slice(-MAX_RECORDS);
      this.record(id, request.prompt, started, "successful");
      return result;
    } catch (error) {
      this.record(id, request.prompt, started, "failed");
      throw error;
    }
  }
  readonly vehicles: VehicleRepository = {
    list: async () => structuredClone(this.catalog),
    quote: async (configuration) => this.quote(configuration),
    requestTestDrive: async (request) => this.requestTestDrive(request),
  };
  private requestTestDrive(request: TestDriveRequest): TestDriveReceipt {
    const parsed = z
      .object({
        vehicle_id: z.string(),
        name: z.string().trim().min(2).max(100),
        email: z.email(),
        preferred_date: z.iso.date(),
        consent: z.literal(true),
      })
      .parse(request);
    this.vehicle(parsed.vehicle_id);
    const today = new Date().toLocaleDateString("en-CA");
    if (parsed.preferred_date < today) throw new Error("Choose today or a future date.");
    const receipt = { id: crypto.randomUUID(), status: "requested" as const };
    // Store only receipt metadata; no contact details are retained in browser storage.
    try {
      this.storage?.setItem(
        "autonex-last-demo-request",
        JSON.stringify({
          ...receipt,
          vehicle_id: parsed.vehicle_id,
          preferred_date: parsed.preferred_date,
        }),
      );
    } catch {
      /* The receipt remains available in the current dialog. */
    }
    return receipt;
  }
  readonly agent: AgentRepository = {
    health: async () => this.health,
    documents: async () => structuredClone(this.documents),
    run: (request, onStep) => this.run(request, onStep),
    operations: async () => structuredClone(this.saved.operations),
    recentRuns: async () => structuredClone(this.saved.runs),
    downloadReport: async (run) => {
      const { downloadBrowserReport } = await import("../browserReport");
      await downloadBrowserReport(run);
    },
  };
  readonly service: ServiceRepository = {
    centers: async (query): Promise<ServiceCenters> => ({
      demo: true,
      query,
      centers: [
        { id: "virtual-autonex", name: "AUTONEX Demonstration Center", location: "Virtual only" },
      ],
    }),
    simulate: async (vehicleId, service): Promise<ServiceReceipt> => {
      this.vehicle(vehicleId);
      if (!service.trim() || service.length > 200) throw new Error("Choose a valid service.");
      return {
        demo: true,
        status: "simulated",
        vehicle_id: vehicleId,
        service,
        booking_created: false,
      };
    },
  };
}
