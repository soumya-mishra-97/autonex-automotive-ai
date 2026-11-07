import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import type { TestDriveReceipt, Vehicle } from "../domain/models";
import type { VehicleRepository } from "../domain/ports";

interface Props {
  vehicle: Vehicle;
  repository: VehicleRepository;
  onClose(): void;
}

export function TestDriveDialog({ vehicle, repository, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TestDriveReceipt | null>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} className="test-drive-dialog">
      <button
        className="icon-button dialog-close"
        aria-label="Close test drive request"
        onClick={onClose}
      >
        <X size={19} />
      </button>
      {receipt ? (
        <div className="receipt">
          <span className="concierge-symbol">
            <Check size={26} />
          </span>
          <span className="eyebrow">REQUEST RECEIVED</span>
          <h2>
            Your next chapter
            <br />
            <em>is getting closer.</em>
          </h2>
          <p>
            Your interest in the {vehicle.name} has been saved locally. This demo does not confirm a
            reservation or send an email.
          </p>
          <span className="receipt-id">Reference: {receipt.id}</span>
          <button className="primary-button full-width" onClick={onClose}>
            Back to the collection
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <>
          <span className="eyebrow">EXPERIENCE {vehicle.name}</span>
          <h2>
            Some things are
            <br />
            <em>better felt.</em>
          </h2>
          <p>Request a test drive. Leave your preferred date and contact details below.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setPending(true);
              setError(null);
              void repository
                .requestTestDrive({
                  vehicle_id: vehicle.id,
                  name: String(data.get("name")),
                  email: String(data.get("email")),
                  preferred_date: String(data.get("date")),
                  consent: true,
                })
                .then(setReceipt)
                .catch((cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : "Please try again."),
                )
                .finally(() => setPending(false));
            }}
          >
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Alex Morgan"
                disabled={pending}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="alex@example.com"
                disabled={pending}
              />
            </label>
            <label>
              Preferred date
              <input
                name="date"
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
                required
                disabled={pending}
              />
            </label>
            <label className="consent-label">
              <input name="consent" type="checkbox" required disabled={pending} />
              <span>I agree to save these details for this demo request.</span>
            </label>
            {error && (
              <p role="alert" className="error-box">
                {error}
              </p>
            )}
            <button className="primary-button full-width" type="submit" disabled={pending}>
              {pending ? "Saving request…" : "Request a test drive"}
              <ArrowRight size={16} />
            </button>
            <p className="fine-print">
              A request is not a confirmed appointment. No email will be sent.
            </p>
          </form>
        </>
      )}
    </dialog>
  );
}
