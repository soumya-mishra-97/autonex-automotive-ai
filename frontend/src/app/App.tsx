import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CarFront,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  GitBranch,
  Headphones,
  House,
  LoaderCircle,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useShowroom, vehicleRepository, serviceRepository } from "./composition";
import type { View } from "../application/showroom";
import { ReportDownload } from "../components/ReportDownload";
import { Brand } from "../components/Brand";
import { Showroom } from "../features/Showroom";
import { Concierge } from "../features/Concierge";
import { Configurator } from "../features/Configurator";
import { Compare } from "../features/Compare";
import { Knowledge } from "../features/Knowledge";
import { TestDriveDialog } from "../features/TestDriveDialog";
import { Operations, Workflow } from "../features/Operations";
import type { ServiceCenters } from "../domain/models";
import { money } from "../domain/models";

const navigation: { id: View; label: string; Icon: LucideIcon }[] = [
  { id: "showroom", label: "DASHBOARD", Icon: House },
  { id: "assistant", label: "AI ASSISTANT", Icon: Bot },
  { id: "compare", label: "VEHICLE EXPLORER", Icon: CarFront },
  { id: "compare", label: "MODEL COMPARISON", Icon: ShieldCheck },
  { id: "workflow", label: "AGENT WORKFLOW", Icon: GitBranch },
  { id: "operations", label: "OPERATIONS", Icon: ChartNoAxesCombined },
  { id: "knowledge", label: "KNOWLEDGE HUB", Icon: BookOpen },
  { id: "reports", label: "REPORTS", Icon: FileText },
  { id: "settings", label: "SETTINGS", Icon: Settings },
];
function initialTheme(): "light" | "dark" {
  try {
    return localStorage.getItem("autonex-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function App() {
  const {
    loading,
    error,
    load,
    view,
    setView,
    panel,
    setPanel,
    vehicles,
    configuration,
    quote,
    quotePending,
    health,
    runs,
  } = useShowroom();
  const [theme, setTheme] = useState(initialTheme);
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<"drive" | "service" | "support" | null>(null);
  const [notifications, setNotifications] = useState(false);
  const vehicle = vehicles.find((item) => item.id === configuration?.vehicle_id);
  useEffect(() => {
    void useShowroom.getState().load();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("autonex-theme", theme);
    } catch {
      /* Storage may be disabled in private browsers. */
    }
  }, [theme]);
  const go = (next: View) => {
    setView(next);
    setMenu(false);
  };
  const selectedTab =
    view === "operations"
      ? "operations"
      : view === "workflow"
        ? "workflow"
        : view === "reports"
          ? "reports"
          : "showroom";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        SKIP TO CONTENT
      </a>
      <header className="header">
        <button
          className="mobile-menu icon-button"
          aria-label="Toggle navigation"
          onClick={() => setMenu(!menu)}
        >
          <Menu size={22} />
        </button>
        <button
          className="brand-button"
          onClick={() => go("showroom")}
          aria-label="AUTONEX AI home"
        >
          <Brand />
        </button>
        <nav aria-label="Workspace navigation">
          {(
            [
              { id: "showroom", label: "CUSTOMER EXPERIENCE", Icon: CarFront },
              { id: "operations", label: "OPERATIONS", Icon: ChartNoAxesCombined },
              { id: "workflow", label: "AGENT WORKFLOW", Icon: GitBranch },
              { id: "reports", label: "REPORTS", Icon: FileText },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button key={id} className={selectedTab === id ? "active" : ""} onClick={() => go(id)}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <button
            className="notification-button"
            aria-label="Show notifications"
            aria-expanded={notifications}
            onClick={() => setNotifications(!notifications)}
          >
            <Bell size={21} />
            <i />
          </button>
          <button className="avatar" aria-label="Open settings" onClick={() => go("settings")}>
            AX
          </button>
        </div>
        {notifications && (
          <div className="notification-popover">
            <h3>SYSTEM NOTIFICATIONS</h3>
            <p>
              {health?.transport === "browser"
                ? "Browser demo ready. No server connection is needed."
                : health
                  ? "Demonstration workspace connected."
                  : "Opening your workspace."}
            </p>
            <p>No authorized partner systems are connected.</p>
          </div>
        )}
      </header>
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <span className="sidebar-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, Icon }, index) => (
            <button
              key={label}
              className={view === id && !(id === "compare" && index === 3) ? "active" : ""}
              onClick={() => go(id)}
              aria-current={view === id && index !== 3 ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {view === id && index !== 3 && <ChevronRight size={13} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-status">
            <span className="status-dot" />
            <span>
              DEMONSTRATION MODE<small>INDEPENDENT PLATFORM</small>
            </span>
          </div>
          <div className="theme-row">
            <span>APPEARANCE</span>
            <div className="theme-toggle" role="group" aria-label="Color theme">
              <button
                aria-label="Light theme"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                <Sun size={16} />
              </button>
              <button
                aria-label="Dark theme"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                <Moon size={16} />
              </button>
            </div>
          </div>
          <span className="sidebar-version">
            AUTONEX AI <span>V1.0</span>
          </span>
        </div>
      </aside>
      <main id="main-content" className="main">
        <div className="workspace-heading">
          <div className="breadcrumbs">
            WORKSPACE <ChevronRight size={11} />
            <span>{navigation.find((item) => item.id === view)?.label ?? "DASHBOARD"}</span>
          </div>
          <span className="environment-label">
            <span className="status-dot" />
            {health?.transport === "browser"
              ? "LOCAL DEMO"
              : health
                ? "API CONNECTED"
                : "INITIALIZING"}
            <span>DEMO ENVIRONMENT</span>
          </span>
        </div>
        <div className="page-heading">
          <div>
            <span className="eyebrow">THE FUTURE OF AUTOMOTIVE INTELLIGENCE</span>
            <h2>
              {view === "showroom"
                ? "ONE PLATFORM. EVERY POSSIBILITY."
                : view === "assistant"
                  ? "YOUR AUTOMOTIVE AI ASSISTANT."
                  : view === "compare"
                    ? "FIND YOUR NEXT DRIVE."
                    : view === "knowledge"
                      ? "KNOWLEDGE, CONNECTED."
                      : view === "operations"
                        ? "INTELLIGENCE IN OPERATION."
                        : view === "workflow"
                          ? "EVERY AGENT. EVERY STEP."
                          : view === "reports"
                            ? "INSIGHTS WORTH SHARING."
                            : "YOUR WORKSPACE. YOUR WAY."}
            </h2>
            <p>
              Customer experiences, vehicle intelligence, and agent orchestration. Seamlessly
              connected.
            </p>
          </div>
          <span className="domain-badge">
            <CarFront size={16} />
            <span>
              MULTI-BRAND VEHICLE INTELLIGENCE<small>BMW + XUV DEMONSTRATION</small>
            </span>
          </span>
        </div>
        {health?.transport === "browser" && (
          <div className="local-demo-banner" role="status">
            <Bot size={20} />
            <div>
              <strong>LOCAL DEMO ACTIVE</strong>
              <p>All demo features work in your browser. No backend connection is required.</p>
            </div>
            <button onClick={() => window.location.reload()}>
              CHECK CONNECTION
              <ArrowRight size={13} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
            <button onClick={() => void load()}>TRY AGAIN</button>
          </div>
        )}
        {loading ? (
          <div className="page-status" role="status">
            <LoaderCircle size={28} className="spin" />
            <h2>OPENING YOUR WORKSPACE…</h2>
          </div>
        ) : (
          <>
            {(["showroom", "compare", "knowledge", "assistant"] as View[]).includes(view) && (
              <div className="experience-grid">
                <div>
                  {view === "showroom" || view === "assistant" ? (
                    <Showroom dark={theme === "dark"} />
                  ) : view === "compare" ? (
                    <Compare />
                  ) : (
                    <Knowledge />
                  )}
                </div>
                <aside className="assistant-panel" aria-label="Your automotive AI assistant">
                  <div className="assistant-heading">
                    <span>
                      <Bot size={20} />
                      AUTONEX AI ASSISTANT
                    </span>
                    <span className="assistant-online">
                      <span className="status-dot" />
                      {health?.mode === "live" ? "LIVE AI" : "DEMO"}
                    </span>
                  </div>
                  <div className="panel-tabs" role="group" aria-label="Assistant mode">
                    <button
                      aria-pressed={panel === "concierge"}
                      onClick={() => setPanel("concierge")}
                    >
                      <Bot size={14} />
                      AI ASSISTANT
                    </button>
                    <button
                      aria-pressed={panel === "configure"}
                      onClick={() => setPanel("configure")}
                    >
                      <Wrench size={14} />
                      CONFIGURE VEHICLE
                    </button>
                  </div>
                  {panel === "concierge" ? (
                    <Concierge onService={() => setDialog("service")} />
                  ) : (
                    <Configurator />
                  )}
                </aside>
              </div>
            )}
            {(view === "showroom" || view === "assistant") && (
              <div className="overview-grid">
                <Operations compact />
                <Workflow compact />
                <section className="card quick-actions">
                  <div className="card-heading">
                    <h3>
                      <Zap size={19} />
                      QUICK ACTIONS
                    </h3>
                    <span>LET’S GET STARTED</span>
                  </div>
                  <div className="quick-action-grid">
                    {[
                      { Icon: CarFront, label: "EXPLORE VEHICLES", action: () => go("compare") },
                      { Icon: Wrench, label: "SERVICE DEMO", action: () => setDialog("service") },
                      { Icon: Download, label: "GENERATE REPORT", action: () => go("reports") },
                      {
                        Icon: Headphones,
                        label: "CONTACT SUPPORT",
                        action: () => setDialog("support"),
                      },
                    ].map(({ Icon, label, action }) => (
                      <button key={label} onClick={action}>
                        <Icon size={25} />
                        <span>{label}</span>
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
            {view === "operations" && <Operations />}
            {view === "workflow" && <Workflow />}
            {view === "reports" && (
              <section className="card report-page">
                <div className="card-heading">
                  <h3>
                    <ClipboardList size={20} />
                    EXECUTION REPORTS
                  </h3>
                  <span>{runs.length} RECENT IN THIS SESSION</span>
                </div>
                <p>
                  Download a PDF with the validated configuration, source excerpts, execution
                  timings, and demonstration disclosures.
                </p>
                {runs.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={34} />
                    <h3>YOUR NEXT INSIGHT STARTS WITH A QUESTION</h3>
                    <p>Ask the assistant to create your first execution report.</p>
                    <button className="primary-button" onClick={() => go("assistant")}>
                      OPEN AI ASSISTANT
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  runs
                    .slice()
                    .reverse()
                    .map((run) => (
                      <article className="report-row" key={run.id}>
                        <FileText size={24} />
                        <div>
                          <h3>{run.summary}</h3>
                          <p>
                            {new Date(run.created_at).toLocaleString()} · {run.sources.length}{" "}
                            sources · {run.mode}
                          </p>
                          <small>{run.id}</small>
                        </div>
                        <ReportDownload run={run} />
                      </article>
                    ))
                )}
              </section>
            )}
            {view === "settings" && (
              <section className="card settings-page">
                <h3>
                  <Settings size={20} />
                  WORKSPACE SETTINGS
                </h3>
                <div>
                  <h4>APPEARANCE</h4>
                  <p>Times New Roman. Burgundy by design. Your theme is saved on this device.</p>
                  <div className="settings-themes">
                    <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
                      <Sun size={22} />
                      LIGHT MODE{theme === "light" && <Check size={16} />}
                    </button>
                    <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
                      <Moon size={22} />
                      DARK MODE{theme === "dark" && <Check size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <h4>CONNECTED SERVICES</h4>
                  <dl className="settings-list">
                    <div>
                      <dt>WORKSPACE MODE</dt>
                      <dd>
                        {health?.transport === "browser"
                          ? "Local browser demo"
                          : "Connected FastAPI backend"}
                      </dd>
                    </div>
                    <div>
                      <dt>LANGUAGE MODEL</dt>
                      <dd>{health?.model}</dd>
                    </div>
                    <div>
                      <dt>RETRIEVAL</dt>
                      <dd>{health?.retrieval}</dd>
                    </div>
                    <div>
                      <dt>MCP CONNECTOR</dt>
                      <dd>
                        {health?.transport === "browser"
                          ? "Browser simulation · No MCP server"
                          : "Local demonstration server"}
                      </dd>
                    </div>
                    <div>
                      <dt>PARTNER INTEGRATIONS</dt>
                      <dd>None authorized</dd>
                    </div>
                  </dl>
                </div>
              </section>
            )}
            {vehicle && (["showroom", "compare", "assistant"] as View[]).includes(view) && (
              <section className="build-bar" aria-label="Your build summary">
                <div className="build-bar-model">
                  <Brand small />
                  <span>
                    <strong>{vehicle.name}</strong>
                    <small>
                      {vehicle.trims.find((trim) => trim.id === configuration?.trim_id)?.name} ·{" "}
                      {vehicle.colors.find((color) => color.id === configuration?.color_id)?.name}
                    </small>
                  </span>
                  <span className="demo-chip">DEMO CONFIGURATION</span>
                </div>
                <div className="build-bar-actions">
                  <div aria-live="polite">
                    <span>ILLUSTRATIVE ESTIMATE</span>
                    <strong>
                      {quotePending ? "CALCULATING…" : quote ? money(quote.total) : "UNAVAILABLE"}
                      <small> USD</small>
                    </strong>
                  </div>
                  <button className="primary-button" onClick={() => setDialog("drive")}>
                    REQUEST DEMO TEST DRIVE
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            )}
          </>
        )}
        <footer>
          <span>
            <ShieldCheck size={14} />
            INDEPENDENT BY DESIGN. INTELLIGENT BY NATURE.
          </span>
          <p>
            © {new Date().getFullYear()} AUTONEX AI <b>·</b> Third-party demonstration. No official
            manufacturer affiliation or live partner system access.
          </p>
          <span className="footer-status">
            <Activity size={13} />
            {health?.mode === "live" ? "LIVE MODEL · MOCK TOOLS" : "DEMO DATA · MOCK CONNECTORS"}
          </span>
        </footer>
      </main>
      {dialog === "drive" && vehicle && (
        <TestDriveDialog
          vehicle={vehicle}
          repository={vehicleRepository}
          onClose={() => setDialog(null)}
        />
      )}
      {(dialog === "service" || dialog === "support") && (
        <InfoDialog kind={dialog} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
function InfoDialog({ kind, onClose }: { kind: "service" | "support"; onClose(): void }) {
  const ref = (element: HTMLDialogElement | null) => {
    if (element && !element.open) element.showModal();
  };
  const { vehicles, configuration, health } = useShowroom();
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centers, setCenters] = useState<ServiceCenters | null>(null);
  useEffect(() => {
    if (kind === "service")
      void serviceRepository
        .centers("AUTONEX demonstration")
        .then(setCenters)
        .catch(() =>
          setError(
            "The mock service connector is unavailable. Please reopen this dialog to retry.",
          ),
        );
  }, [kind]);
  return (
    <dialog ref={ref} className="test-drive-dialog" onCancel={onClose}>
      <button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}>
        <X size={20} />
      </button>
      <span className="eyebrow">AUTONEX AI · DEMONSTRATION</span>
      <h2>{kind === "service" ? "SERVICE REQUEST DEMO" : "WORKSPACE SUPPORT"}</h2>
      {kind === "support" ? (
        <>
          <p>
            For local setup, API configuration, and troubleshooting, see the README and deployment
            guide in this repository.
          </p>
          <p>
            The browser demo works without a server. To use the backend workflow and configured LLM,
            start FastAPI on port 8000. Backend API documentation is available at{" "}
            <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer">
              LOCAL API DOCS
            </a>
            .
          </p>
        </>
      ) : submitted ? (
        <>
          <div className="success-notice">
            <Check size={24} />
            <h3>DEMONSTRATION COMPLETE</h3>
          </div>
          <p>
            {health?.transport === "browser"
              ? "Your request has been simulated in this browser."
              : "Your request has been simulated by the mock MCP connector."}{" "}
            No booking was created or sent to a service center.
          </p>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            const data = new FormData(event.currentTarget);
            void serviceRepository
              .simulate(String(data.get("vehicle")), String(data.get("service")))
              .then(() => setSubmitted(true))
              .catch(() => setError("The service simulation could not complete. Please retry."))
              .finally(() => setPending(false));
          }}
        >
          <p>
            Preview a service request. This simulation does not contact a dealer or make an
            appointment.
          </p>
          <label>
            VEHICLE
            <select name="vehicle" disabled={pending} defaultValue={configuration?.vehicle_id}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            SERVICE TYPE
            <select name="service" disabled={pending}>
              <option>Routine maintenance</option>
              <option>Vehicle inspection</option>
              <option>Charging consultation</option>
            </select>
          </label>
          <label>
            DEMO SERVICE CENTER
            <select disabled={pending || !centers}>
              {centers?.centers.map((center) => (
                <option key={center.id}>
                  {center.name} · {center.location}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={pending || !centers}>
            {pending ? "SIMULATING…" : "SIMULATE REQUEST"}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
      <button className="text-button" onClick={onClose}>
        CLOSE WORKSPACE DIALOG
      </button>
    </dialog>
  );
}
