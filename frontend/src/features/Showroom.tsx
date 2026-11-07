import { lazy, Suspense, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Check,
  Grid2X2,
  Palette,
  Rotate3D,
  Armchair,
  Maximize,
} from "lucide-react";
import { useShowroom } from "../app/composition";
import { CarArtwork } from "../components/CarArtwork";
const VehicleScene = lazy(() => import("./vehicle/VehicleScene"));
export function Showroom({ dark = false }: { dark?: boolean }) {
  const { vehicles, configuration, setView, setPanel, configure, selectVehicle } = useShowroom();
  const [mode, setMode] = useState("exterior");
  const [angle, setAngle] = useState(0);
  const vehicle = vehicles.find((item) => item.id === configuration?.vehicle_id);
  if (!vehicle || !configuration) return null;
  const color = vehicle.colors.find((item) => item.id === configuration.color_id);
  return (
    <section className="vehicle-stage" aria-label="Your selected vehicle">
      <div className="showroom-architecture" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hero-copy">
        <span className="eyebrow">INTELLIGENCE IN EVERY JOURNEY</span>
        <h1>
          DISCOVER YOUR
          <br />
          NEXT DRIVE.
          <br />
          <em>POWERED BY AI.</em>
        </h1>
        <p>
          EXPLORE VEHICLES. COMPARE POSSIBILITIES.
          <br />
          LET INTELLIGENCE LEAD THE WAY.
        </p>
        <button className="primary-button" onClick={() => setView("compare")}>
          EXPLORE MODELS
          <ArrowRight size={17} />
        </button>
        <span className="hero-domain">
          {vehicle.body_type === "xuv" ? "G-WAGON-INSPIRED XUV" : "BMW VEHICLE INTELLIGENCE"}{" "}
          <span>INDEPENDENT CONCEPT DEMONSTRATION</span>
        </span>
      </div>
      <label className="hero-model">
        <span className="sr-only">Showroom model</span>
        <select
          aria-label="Showroom model"
          value={vehicle.id}
          onChange={(event) => selectVehicle(event.target.value)}
        >
          {vehicles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <small>
          {vehicle.is_default ? "FEATURED XUV · DEMO CONCEPT" : "INTERACTIVE CONCEPT VISUALIZATION"}
        </small>
      </label>
      <div className="car-platform" aria-hidden="true" />
      <div className={`vehicle-canvas${vehicle.body_type === "xuv" ? " xuv-canvas" : ""}`}>
        <Suspense
          fallback={
            <CarArtwork
              color={color?.hex ?? "#800020"}
              bodyType={vehicle.body_type}
              name={vehicle.name}
            />
          }
        >
          <VehicleScene
            color={color?.hex ?? "#800020"}
            bodyType={vehicle.body_type}
            name={vehicle.name}
            interior={mode === "interior"}
            angle={angle}
            dark={dark}
          />
        </Suspense>
      </div>
      <div className="scene-controls" aria-label="Vehicle view">
        {[
          { id: "exterior", label: "EXTERIOR", Icon: CarFront },
          { id: "interior", label: "INTERIOR", Icon: Armchair },
          { id: "features", label: "FEATURES", Icon: Grid2X2 },
          { id: "colors", label: "COLORS", Icon: Palette },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              if (id === "features") setPanel("configure");
            }}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {mode === "colors" && (
        <div className="paint-picker" role="group" aria-label="Exterior paint">
          {vehicle.colors.map((item) => (
            <button
              key={item.id}
              className={`swatch ${item.id === color?.id ? "selected" : ""}`}
              style={{ background: item.hex }}
              title={item.name}
              aria-label={item.name}
              aria-pressed={item.id === color?.id}
              onClick={() => configure({ color_id: item.id })}
            >
              {item.id === color?.id && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
      <div className="rotation-controls">
        <button
          className="round-button"
          aria-label="Rotate vehicle left"
          onClick={() => setAngle(angle - Math.PI / 4)}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          <Rotate3D size={17} />
          360° VIEW <small>DRAG TO EXPLORE</small>
        </span>
        <button
          className="round-button"
          aria-label="Rotate vehicle right"
          onClick={() => setAngle(angle + Math.PI / 4)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <button
        className="scene-expand"
        aria-label="Open vehicle configurator"
        onClick={() => setPanel("configure")}
      >
        <Maximize size={16} />
      </button>
    </section>
  );
}
