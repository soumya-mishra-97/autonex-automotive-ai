import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { useShowroom } from "../app/composition";
import { money } from "../domain/models";

export function Configurator() {
  const {
    vehicles,
    configuration,
    quote,
    quotePending,
    quoteError,
    configure,
    selectVehicle,
    refreshQuote,
  } = useShowroom();
  const vehicle = vehicles.find((item) => item.id === configuration?.vehicle_id);
  if (!configuration || !vehicle) return null;
  return (
    <div className="configurator">
      <div className="panel-intro">
        <span className="eyebrow">PERSONAL BY DESIGN</span>
        <h3>
          Every detail.
          <br />
          <em>Uniquely yours.</em>
        </h3>
        <p>Refine your {vehicle.name}. We’ll calculate your estimate as you go.</p>
      </div>
      <fieldset className="trim-options">
        <legend>
          01 <span>Choose your drive</span>
        </legend>
        {vehicle.trims.map((trim) => (
          <label
            className={`trim-option ${trim.id === configuration.trim_id ? "active" : ""}`}
            key={trim.id}
          >
            <input
              type="radio"
              name="trim"
              value={trim.id}
              checked={trim.id === configuration.trim_id}
              onChange={() => configure({ trim_id: trim.id })}
            />
            <div>
              <strong>{trim.name}</strong>
              <small>
                {trim.horsepower} hp · {trim.drivetrain}
              </small>
            </div>
            <span>{money(trim.base_price)}</span>
          </label>
        ))}
      </fieldset>
      <div className="config-options">
        <label>
          02 <span>Exterior paint</span>
          <div className="select-wrap">
            <select
              value={configuration.color_id}
              onChange={(event) => configure({ color_id: event.target.value })}
            >
              {vehicle.colors.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                  {item.price_delta ? ` +${money(item.price_delta)}` : " · Included"}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <label>
          03 <span>Wheels</span>
          <div className="select-wrap">
            <select
              value={configuration.wheel_id}
              onChange={(event) => configure({ wheel_id: event.target.value })}
            >
              {vehicle.wheels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.price_delta ? `+${money(item.price_delta)}` : "Included"}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
        <label>
          04 <span>Interior</span>
          <div className="select-wrap">
            <select
              value={configuration.interior_id}
              onChange={(event) => configure({ interior_id: event.target.value })}
            >
              {vehicle.interiors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.price_delta ? `+${money(item.price_delta)}` : "Included"}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </label>
      </div>
      <fieldset className="package-options">
        <legend>
          05 <span>A little extra</span>
        </legend>
        {vehicle.packages.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={configuration.package_ids.includes(item.id)}
              onChange={(event) =>
                configure({
                  package_ids: event.target.checked
                    ? [...configuration.package_ids, item.id]
                    : configuration.package_ids.filter((id) => id !== item.id),
                })
              }
            />
            <div>
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </div>
            <span>+{money(item.price_delta)}</span>
          </label>
        ))}
      </fieldset>
      <div className="config-total" aria-live="polite">
        <span>
          Your configuration
          <strong>
            {quotePending ? "Calculating…" : quote ? money(quote.total) : "Estimate unavailable"}
          </strong>
        </span>
        <Check size={22} />
      </div>
      {quoteError && (
        <div role="alert" className="error-box">
          {quoteError}
          <button onClick={() => void refreshQuote()}>Retry estimate</button>
        </div>
      )}
      <button className="text-button reset-button" onClick={() => selectVehicle(vehicle.id)}>
        <RotateCcw size={13} />
        Reset to standard configuration
      </button>
    </div>
  );
}
