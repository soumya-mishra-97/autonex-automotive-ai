import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  GitBranch,
  LoaderCircle,
  Send,
  Sparkles,
  Scale,
  Settings,
  MapPin,
} from "lucide-react";
import { useShowroom } from "../app/composition";
import { money } from "../domain/models";

const suggestions = [
  {
    label: "COMPARE MODELS",
    prompt: "Compare the performance and comfort of the demonstration vehicles.",
    Icon: Scale,
  },
  {
    label: "EXPLAIN FEATURES",
    prompt: "Explain the performance features of a sporty blue car under $75k.",
    Icon: Settings,
  },
  { label: "FIND SERVICE CENTER", prompt: "", Icon: MapPin },
  {
    label: "VEHICLE GUIDE",
    prompt: "Explain electric vehicle charging and ownership guidance.",
    Icon: BookOpen,
  },
];

export function Concierge({ onService }: { onService(): void }) {
  const { health, agentPending, agentError, runs, ask, applyRun } = useShowroom();
  const [prompt, setPrompt] = useState("");
  const [detail, setDetail] = useState<"recommendation" | "trace">("recommendation");
  const latest = runs.at(-1);
  const submit = (value: string) => {
    if (value.trim().length < 3 || agentPending) return;
    setPrompt(value);
    setDetail("recommendation");
    void ask(value);
  };
  return (
    <div className="concierge">
      <div className="assistant-welcome">
        <span className="assistant-avatar">
          <Sparkles size={22} />
        </span>
        <div>
          <h3>HELLO, I’M YOUR AUTONEX AI ASSISTANT.</h3>
          <p>How can I help you move forward today?</p>
        </div>
      </div>
      {!latest && (
        <>
          <div className="suggestions">
            {suggestions.map(({ label, prompt, Icon }) => (
              <button
                key={label}
                disabled={agentPending}
                onClick={() => (prompt ? submit(prompt) : onService())}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
          <div className="assistant-note">
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <button
              disabled={agentPending}
              onClick={() =>
                submit("I want a sporty blue gran-coupe for daily driving under $75k.")
              }
            >
              Find a sporty car for my everyday drive
              <ArrowRight size={13} />
            </button>
          </div>
        </>
      )}
      {latest && (
        <div className="conversation">
          <div className="user-message">
            <span>YOU</span>
            <p>{latest.prompt}</p>
          </div>
          <div className="result-tabs" role="group" aria-label="Recommendation details">
            <button
              aria-pressed={detail === "recommendation"}
              onClick={() => setDetail("recommendation")}
            >
              <Sparkles size={13} />
              Recommendation
            </button>
            <button aria-pressed={detail === "trace"} onClick={() => setDetail("trace")}>
              <GitBranch size={13} />
              Run details
            </button>
          </div>
          {detail === "recommendation" ? (
            <div className="recommendation">
              <span className="small-label">
                <CircleCheck size={13} /> A FIT FOR YOUR LIFE
              </span>
              <h4>{latest.summary}</h4>
              <p>{latest.rationale}</p>
              <div className="recommendation-price">
                <span>Estimated configuration</span>
                <strong>{money(latest.quote.total)}</strong>
              </div>
              {!latest.needs_clarification && (
                <button className="primary-button full-width" onClick={() => applyRun(latest)}>
                  Apply configuration
                  <ArrowRight size={16} />
                </button>
              )}
              {latest.sources.length > 0 && (
                <div className="sources">
                  <span className="small-label">
                    <BookOpen size={13} /> GROUNDED IN {latest.sources.length} SOURCES
                  </span>
                  {latest.sources.map((source) => (
                    <details key={source.id}>
                      <summary>
                        {source.title}
                        <ChevronRight size={13} />
                      </summary>
                      <p>{source.excerpt}</p>
                      <small>
                        Source {source.id} · Version {source.version}
                      </small>
                      {source.url && (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          VIEW PUBLISHED REFERENCE ↗
                        </a>
                      )}
                    </details>
                  ))}
                </div>
              )}
              <div className="run-notes">
                {latest.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="trace">
              <p className="trace-intro">
                The steps completed for this recommendation.{" "}
                {latest.mode === "demo"
                  ? "Demo mode uses deterministic planning and lexical search."
                  : "Live mode uses the configured LLM and semantic retrieval."}
              </p>
              {latest.trace.map((step, index) => (
                <div className="trace-step" key={step.node}>
                  <span>
                    <Check size={12} />
                  </span>
                  <div>
                    <small>
                      0{index + 1} / {step.duration_ms} ms
                    </small>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
              <small className="run-id">Run {latest.id}</small>
            </div>
          )}
        </div>
      )}
      {agentPending && (
        <div className="thinking" role="status">
          <LoaderCircle size={17} className="spin" />
          <div>
            Finding your fit…<small>Researching options and checking the estimate.</small>
          </div>
        </div>
      )}
      {agentError && (
        <div role="alert" className="error-box">
          {agentError}
          <button onClick={() => submit(prompt)}>Try again</button>
        </div>
      )}
      <form
        className="prompt-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(prompt);
        }}
      >
        <label className="sr-only" htmlFor="concierge-prompt">
          Describe your ideal drive
        </label>
        <textarea
          id="concierge-prompt"
          placeholder={
            latest ? "What would you like to change?" : "Ask about vehicles, features, or services…"
          }
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          minLength={3}
          maxLength={4000}
          rows={2}
          disabled={agentPending}
        />
        <div>
          <span>{latest ? "Keep the conversation going" : "Start with what matters to you"}</span>
          <button
            className="send-button"
            type="submit"
            disabled={agentPending || prompt.trim().length < 3}
            aria-label="Send to concierge"
          >
            {agentPending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
      <p className="concierge-disclosure">
        <span className="status-dot" />
        {health?.mode === "live"
          ? "LIVE AI · VERIFY IMPORTANT DETAILS"
          : "DEMO ASSISTANT · NO LLM CONNECTED"}
      </p>
    </div>
  );
}
