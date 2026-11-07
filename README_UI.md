# AUTONEX AI UI

The application follows the composition of the supplied dashboard reference with AUTONEX branding. The top workspace tabs and left navigation connect a single React application. The dashboard combines the showroom, assistant, operations overview, workflow and quick actions.

## Design tokens

| Token            | Value                           |
| ---------------- | ------------------------------- |
| Primary          | `#800020`                       |
| Deep burgundy    | `#4A0015`                       |
| Light background | `#FAF7F4`                       |
| Dark background  | `#180B12`                       |
| Font             | `Times New Roman`, Times, serif |

Appearance buttons in the sidebar and settings switch themes. `autonex-theme` in localStorage persists the choice on this device. Storage being unavailable does not prevent using the app. The mobile menu reveals navigation on narrow screens; there is no horizontal page overflow at the tested mobile size.

## User guide

1. Start the frontend and open the dashboard. If FastAPI is unavailable, LOCAL DEMO ACTIVE appears and all demonstration features remain available. Start FastAPI and click CHECK CONNECTION to use the backend.
2. The dashboard opens on AUTONEX XUV, an independent G-Wagon-inspired adventure concept. Use the SHOWROOM MODEL selector above the vehicle to switch between XUV, BMW i4 and BMW iX. Drag the concept vehicle or use the left/right rotation buttons. Exterior shows the body; interior reveals simplified seats through a transparent body. Colors lets you select paint. Features opens the configurator. Scroll/pinch zoom is provided by OrbitControls.
3. Ask a question or select a prompt. In demo mode, deterministic rules exercise the same LangGraph/MCP path without an LLM. Results contain a validated estimate and expandable source excerpts. Run details displays actual completed nodes, timings and retries. Apply configuration updates the same store as manual controls.
4. Compare demonstration models. All numeric catalog values are illustrative. Read separately sourced BMW notes in the knowledge hub.
5. Operations shows activity from the selected adapter: API-recorded runs when connected, or actual browser demo actions when local. Browser mode reports zero LLM tokens and MCP calls. The compact pipeline streams completion events while a request runs. No fixed sample counts or fabricated tool completions are shown.
6. Reports keeps the latest 50 assistant results and downloads their PDFs. Local browser reports and metrics survive a reload when device storage is available. PDF links resolve persisted runs on the backend.
7. Service demo simulates a request against virtual centers. Demo test drives require a checked consent field and save only an interest record. No booking or email results.

## Accessibility and case

Semantic landmarks, labeled controls, keyboard-visible focus, native modal dialogs, a skip link, text status descriptions, contrast-aware theme tokens, and reduced-motion overrides support accessible use. Status is not conveyed by color alone. Uppercase is presentation styling for navigation, headings and buttons; user text, technical IDs, source content and API-provided values remain unchanged. Vehicle visuals also have accessible fallback labels.

The 3D scene is lazy-loaded, uses local lighting, caps pixel ratio, and renders on demand. No external model, font, HDR map or third-party image is required. The procedural vehicle is a concept rather than a BMW asset. Production asset licensing and assistive technology audits remain deployment responsibilities.
