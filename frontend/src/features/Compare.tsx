import { ArrowRight, Check } from "lucide-react";
import { useShowroom } from "../app/composition";
import { CarArtwork } from "../components/CarArtwork";
import { money } from "../domain/models";

export function Compare() {
  const { vehicles, configuration, selectVehicle } = useShowroom();
  return (
    <section className="compare">
      <div className="section-heading">
        <h2>Find your kind of electric.</h2>
        <span>SIDE BY SIDE</span>
      </div>
      <div className="comparison-grid">
        {vehicles.map((vehicle) => (
          <article key={vehicle.id}>
            <span className="eyebrow">{vehicle.model}</span>
            <h3>{vehicle.name}</h3>
            <CarArtwork
              color={vehicle.colors[0]?.hex ?? "#70877c"}
              bodyType={vehicle.body_type}
              name={vehicle.name}
            />
            <p>{vehicle.summary}</p>
            <div className="reference-facts">
              <h4>
                {vehicle.reference_specifications.length
                  ? "PUBLISHED MANUFACTURER REFERENCE"
                  : "INDEPENDENT AUTONEX CONCEPT"}
              </h4>
              {vehicle.reference_specifications.map((spec) => (
                <div key={spec.label}>
                  <strong>{spec.value}</strong>
                  <span>
                    {spec.label} · {spec.variant}
                  </span>
                  <small>{spec.note}</small>
                  <a href={spec.source_url} target="_blank" rel="noreferrer">
                    SOURCE · {spec.published_at} ↗
                  </a>
                </div>
              ))}
            </div>
            <h4 className="demo-spec-title">AUTONEX DEMO CONFIGURATION</h4>
            <dl>
              <div>
                <dt>Starting price</dt>
                <dd>{money(vehicle.trims[0]?.base_price ?? 0)}</dd>
              </div>
              <div>
                <dt>Illustrative range</dt>
                <dd>{vehicle.range_miles} mi</dd>
              </div>
              <div>
                <dt>Base power</dt>
                <dd>{vehicle.trims[0]?.horsepower} hp</dd>
              </div>
              <div>
                <dt>Base 0–60 mph</dt>
                <dd>{vehicle.trims[0]?.zero_to_sixty} s</dd>
              </div>
              <div>
                <dt>10–80% DC charge*</dt>
                <dd>{vehicle.charge_time_10to80_min} min</dd>
              </div>
              <div>
                <dt>Available trims</dt>
                <dd>{vehicle.trims.map((trim) => trim.name).join(" / ")}</dd>
              </div>
            </dl>
            <button className="primary-button full-width" onClick={() => selectVehicle(vehicle.id)}>
              {configuration?.vehicle_id === vehicle.id ? (
                <>
                  <Check size={15} />
                  Continue your build
                </>
              ) : (
                <>
                  Explore {vehicle.name}
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </article>
        ))}
      </div>
      <p className="fine-print">
        Fictional concept specifications. Prices exclude taxes and fees. *Charging under ideal
        conditions.
      </p>
    </section>
  );
}
