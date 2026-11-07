import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { agentRepository } from "../app/composition";
import type { AgentRun } from "../domain/models";

export function ReportDownload({ run }: { run: AgentRun }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="report-download">
      <button
        className="primary-button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void agentRepository
            .downloadReport(run)
            .catch((cause: unknown) =>
              setError(
                cause instanceof Error ? cause.message : "Please retry the report download.",
              ),
            )
            .finally(() => setPending(false));
        }}
      >
        {pending ? "PREPARING PDF…" : "DOWNLOAD PDF"}
        {pending ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />}
      </button>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
