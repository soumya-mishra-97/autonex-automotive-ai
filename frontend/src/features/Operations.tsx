import { lazy, Suspense, useEffect, useState } from "react";
const OperationsChart = lazy(() => import("./OperationsChart"));
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CircleCheck,
  Clock3,
  Database,
  FileText,
  GitBranch,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { agentRepository, useShowroom } from "../app/composition";
import type { OperationsData } from "../domain/models";
const stages = [
  { id: "master", label: "MASTER", sub: "ORCHESTRATE", Icon: GitBranch },
  { id: "understanding", label: "QUESTION", sub: "UNDERSTAND", Icon: MessageSquare },
  { id: "research", label: "RAG AGENT", sub: "RETRIEVE", Icon: Database },
  { id: "specialist", label: "VEHICLE", sub: "INTELLIGENCE", Icon: Bot },
  { id: "tools", label: "TOOL AGENT", sub: "MCP", Icon: Wrench },
  { id: "validation", label: "VALIDATION", sub: "VERIFY", Icon: ShieldCheck },
  { id: "synthesis", label: "RESPONSE", sub: "WITH SOURCES", Icon: CircleCheck },
];
export function Workflow({ compact = false }: { compact?: boolean }) {
  const { runs, agentPending, liveSteps, agentError, setView, health } = useShowroom();
  const latest = runs.at(-1);
  const trace = agentPending ? liveSteps : (latest?.trace ?? []);
  return (
    <section className={`card workflow-card ${compact ? "compact" : ""}`}>
      <div className="card-heading">
        <h3>
          <GitBranch size={19} />
          AGENT WORKFLOW PIPELINE
        </h3>
        <span className={agentPending ? "live-indicator" : ""}>
          <span className="status-dot" />
          {agentPending ? "RUNNING" : latest ? "COMPLETED" : "READY"}
        </span>
      </div>
      <div className="workflow-stages">
        {stages.map(({ id, label, sub, Icon }, index) => {
          const complete = trace.some((step) => step.node === id);
          const active =
            agentPending &&
            !complete &&
            (index === 0 || trace.some((step) => step.node === stages[index - 1]?.id));
          return (
            <div className="workflow-item" key={id}>
              <div
                className={`workflow-node ${complete ? "complete" : ""} ${active ? "running" : ""} ${index === stages.length - 1 ? "final" : ""}`}
              >
                <Icon size={21} />
                <strong>{label}</strong>
                <small>
                  {sub === "MCP" && health?.transport === "browser" ? "LOCAL DEMO" : sub}
                </small>
              </div>
              <span className={`node-state ${complete ? "done" : ""}`}>
                {complete ? (
                  <Check size={10} />
                ) : active ? (
                  <LoaderCircle size={11} className="spin" />
                ) : (
                  <span />
                )}
              </span>
              {index < stages.length - 1 && <ArrowRight className="node-arrow" size={12} />}
            </div>
          );
        })}
      </div>
      <div className="card-footer">
        <span>
          {agentPending
            ? health?.transport === "browser"
              ? "LOCAL DEMO · EXECUTION EVENTS"
              : "ACTUAL EXECUTION · STREAMING NODE EVENTS"
            : latest
              ? `${trace.length} STEPS · ${trace.reduce((sum, step) => sum + step.duration_ms, 0).toLocaleString()} MS`
              : "ASK THE ASSISTANT TO START A WORKFLOW"}
        </span>
        {compact && (
          <button onClick={() => setView("workflow")}>
            VIEW PIPELINE
            <ArrowRight size={11} />
          </button>
        )}
      </div>
      {!compact && (
        <div className="workflow-details">
          <p>
            {health?.transport === "browser"
              ? "Browser demo rules execute question understanding, bundled knowledge retrieval, configuration, local tool simulations, validation and response generation. LangGraph, an LLM and a real MCP transport require the backend."
              : "The master orchestrator routes typed state through question understanding, source retrieval, vehicle intelligence, MCP tools, validation and a cited response. Events below come from the running backend."}
          </p>
          {agentError && (
            <p className="error-box" role="alert">
              {agentError}
            </p>
          )}
          {trace.length ? (
            trace.map((step) => (
              <article key={step.node}>
                <span className="step-check">
                  <Check size={16} />
                </span>
                <div>
                  <h4>{step.label}</h4>
                  <p>{step.detail}</p>
                </div>
                <span>
                  {step.duration_ms} ms<small>{step.retries} RETRIES</small>
                </span>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <GitBranch size={34} />
              <h3>READY WHEN YOU ARE</h3>
              <button className="primary-button" onClick={() => setView("assistant")}>
                ASK A QUESTION
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export function Operations({ compact = false }: { compact?: boolean }) {
  const runs = useShowroom((state) => state.runs);
  const pending = useShowroom((state) => state.agentPending);
  const browserMode = useShowroom((state) => state.health?.transport === "browser");
  const setView = useShowroom((state) => state.setView);
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (disposed || document.hidden) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const result = await agentRepository.operations(request.signal);
        if (!disposed && !request.signal.aborted) {
          setData(result);
          setError(false);
        }
      } catch {
        if (!disposed && !request.signal.aborted) setError(true);
      } finally {
        if (!disposed && !request.signal.aborted && !document.hidden)
          timer = setTimeout(() => void load(), 15000);
      }
    };
    const onVisibility = () => {
      clearTimeout(timer);
      controller?.abort();
      if (!document.hidden) void load();
    };
    void load();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [runs.length, pending, refresh]);
  const metrics = [
    { label: "TOTAL QUERIES", value: data?.total, Icon: MessageSquare, type: "" },
    { label: "SUCCESSFUL", value: data?.successful, Icon: CircleCheck, type: "success" },
    { label: "RETRIED", value: data?.retries, Icon: RefreshCw, type: "" },
    { label: "FAILED", value: data?.failed, Icon: XCircle, type: "failure" },
  ];
  const chart =
    data?.recent
      .slice()
      .reverse()
      .map((run, index) => ({ name: index + 1, latency: run.duration_ms })) ?? [];
  return (
    <section className={`card operations-card ${compact ? "compact" : ""}`}>
      <div className="card-heading">
        <h3>
          <Activity size={19} />
          OPERATIONS OVERVIEW
        </h3>
        <button aria-label="Refresh operations" onClick={() => setRefresh(refresh + 1)}>
          <RefreshCw size={13} />
        </button>
      </div>
      {error ? (
        <div className="error-box" role="alert">
          Metrics unavailable.<button onClick={() => setRefresh(refresh + 1)}>RETRY</button>
        </div>
      ) : (
        <>
          <div className="metric-grid">
            {metrics.map(({ label, value, Icon, type }) => (
              <div className={`metric ${type}`} key={label}>
                <Icon size={compact ? 17 : 25} />
                <strong>{value?.toLocaleString() ?? "—"}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="operations-chart" aria-label="Recorded run latency chart">
            {chart.length ? (
              <Suspense
                fallback={
                  <div className="chart-empty">
                    <small>LOADING CHART…</small>
                  </div>
                }
              >
                <OperationsChart data={chart} compact={compact} />
              </Suspense>
            ) : (
              <div className="chart-empty">
                <span />
                <small>AWAITING FIRST QUERY</small>
              </div>
            )}
          </div>
          <div className="card-footer">
            <span>RECORDED RUNS · LATENCY IN MS</span>
            {compact && (
              <button onClick={() => setView("operations")}>
                VIEW ANALYTICS
                <ArrowRight size={11} />
              </button>
            )}
          </div>
          {!compact && (
            <>
              <div className="extended-metrics">
                <div>
                  <Clock3 size={22} />
                  <span>
                    MEAN LATENCY
                    <strong>{Math.round(data?.latency_ms ?? 0).toLocaleString()} MS</strong>
                  </span>
                </div>
                <div>
                  <FileText size={22} />
                  <span>
                    LLM TOKENS<strong>{data?.tokens.toLocaleString() ?? "—"}</strong>
                  </span>
                </div>
                <div>
                  <Wrench size={22} />
                  <span>
                    MCP TOOL CALLS<strong>{data?.mcp_calls.toLocaleString() ?? "—"}</strong>
                  </span>
                </div>
              </div>
              <h4 className="table-title">EXECUTION & RETRY HISTORY</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>REQUEST</th>
                      <th>STATUS</th>
                      <th>LATENCY</th>
                      <th>RETRIES</th>
                      <th>TOKENS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent.map((run) => (
                      <tr key={run.id}>
                        <td>
                          {run.prompt}
                          <small>{run.id}</small>
                        </td>
                        <td>
                          <span className={`status-pill ${run.status}`}>{run.status}</span>
                        </td>
                        <td>{run.duration_ms} ms</td>
                        <td>{run.retries}</td>
                        <td>{run.tokens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data?.recent.length && (
                  <p className="empty-table">
                    No recorded runs yet. Ask the assistant to get started.
                  </p>
                )}
              </div>
              <p className="fine-print">
                {browserMode
                  ? "Metrics record local browser assistant actions. LLM tokens and MCP calls remain zero because no LLM or MCP server is called."
                  : "Metrics are recorded by this API instance. Demo mode makes no LLM calls and uses zero LLM tokens."}{" "}
                No activity is fabricated.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
