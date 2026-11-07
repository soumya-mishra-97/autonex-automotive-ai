import { create } from "zustand";
import { defaultConfiguration } from "../domain/models";
import type {
  AgentRun,
  ChatMessage,
  Configuration,
  Health,
  KnowledgeDocument,
  Quote,
  TraceStep,
  Vehicle,
} from "../domain/models";
import type { AgentRepository, VehicleRepository } from "../domain/ports";

export type View =
  | "showroom"
  | "compare"
  | "knowledge"
  | "operations"
  | "workflow"
  | "reports"
  | "settings"
  | "assistant";
interface ShowroomState {
  vehicles: Vehicle[];
  documents: KnowledgeDocument[];
  health: Health | null;
  configuration: Configuration | null;
  quote: Quote | null;
  quotePending: boolean;
  loading: boolean;
  error: string | null;
  quoteError: string | null;
  agentError: string | null;
  agentPending: boolean;
  runs: AgentRun[];
  liveSteps: TraceStep[];
  history: ChatMessage[];
  view: View;
  panel: "concierge" | "configure";
  load(): Promise<void>;
  selectVehicle(id: string): void;
  configure(patch: Partial<Configuration>): void;
  refreshQuote(): Promise<void>;
  ask(prompt: string): Promise<void>;
  applyRun(run: AgentRun): void;
  setView(view: View): void;
  setPanel(panel: "concierge" | "configure"): void;
}
export const MAX_SESSION_RUNS = 50;

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please retry.";

export function createShowroomStore(vehicles: VehicleRepository, agent: AgentRepository) {
  let quoteSequence = 0;
  return create<ShowroomState>((set, get) => ({
    vehicles: [],
    documents: [],
    health: null,
    configuration: null,
    quote: null,
    quotePending: false,
    loading: true,
    error: null,
    quoteError: null,
    agentError: null,
    agentPending: false,
    runs: [],
    liveSteps: [],
    history: [],
    view: "showroom",
    panel: "concierge",
    async load() {
      set({ loading: true, error: null });
      try {
        const [catalog, health, documents, runs] = await Promise.all([
          vehicles.list(),
          agent.health(),
          agent.documents(),
          agent.recentRuns?.() ?? [],
        ]);
        const first = catalog.find((vehicle) => vehicle.is_default) ?? catalog[0];
        if (!first) throw new Error("No vehicles are available in the catalog.");
        set({
          vehicles: catalog,
          health,
          documents,
          runs: runs.slice(-MAX_SESSION_RUNS),
          configuration: defaultConfiguration(first),
          loading: false,
        });
        await get().refreshQuote();
      } catch (error) {
        set({ loading: false, error: message(error) });
      }
    },
    selectVehicle(id) {
      const vehicle = get().vehicles.find((item) => item.id === id);
      if (!vehicle) return;
      set({ configuration: defaultConfiguration(vehicle), view: "showroom" });
      void get().refreshQuote();
    },
    configure(patch) {
      const configuration = get().configuration;
      if (!configuration) return;
      // Vehicle identity changes go through selectVehicle, which resets dependent option IDs.
      set({ configuration: { ...configuration, ...patch, vehicle_id: configuration.vehicle_id } });
      void get().refreshQuote();
    },
    async refreshQuote() {
      const config = get().configuration;
      if (!config) return;
      const sequence = ++quoteSequence;
      set({ quotePending: true, quote: null, quoteError: null });
      try {
        const quote = await vehicles.quote(config);
        if (sequence === quoteSequence) set({ quote, quotePending: false });
      } catch (error) {
        if (sequence === quoteSequence) set({ quoteError: message(error), quotePending: false });
      }
    },
    async ask(prompt) {
      if (get().agentPending || prompt.trim().length < 3) return;
      const history = get().history.slice(-8);
      set({ agentPending: true, agentError: null, liveSteps: [], panel: "concierge" });
      try {
        const run = await agent.run({ prompt: prompt.trim(), vehicle_id: null, history }, (step) =>
          set((state) => ({ liveSteps: [...state.liveSteps, step] })),
        );
        set((state) => ({
          runs: [...state.runs, run].slice(-MAX_SESSION_RUNS),
          history: [
            ...state.history,
            { role: "user", content: prompt.trim() },
            { role: "assistant", content: `${run.summary} ${run.rationale}`.slice(0, 4000) },
          ].slice(-8) as ChatMessage[],
          agentPending: false,
        }));
      } catch (error) {
        set({ agentError: message(error), agentPending: false });
      }
    },
    applyRun(run) {
      ++quoteSequence;
      set({
        configuration: run.quote.configuration,
        quote: run.quote,
        quoteError: null,
        quotePending: false,
        panel: "configure",
        view: "showroom",
      });
    },
    setView: (view) => set({ view }),
    setPanel: (panel) => set({ panel }),
  }));
}
