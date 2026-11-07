# MCP integration

The master uses an actual in-process MCP client to invoke the local mock server. The same server is available at `/mcp/` through Streamable HTTP. Tool annotations declare the current tools read-only, non-destructive and closed-world. All tools return demonstration data; none access BMW systems.

| Tool                          | Behavior                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `list_vehicles`               | Read demo catalog and valid options                                                      |
| `get_vehicle_specifications`  | Read one structured demo vehicle                                                         |
| `search_knowledge`            | Retrieve versioned source chunks, optionally vehicle-scoped                              |
| `quote_configuration`         | Validate all option IDs and calculate an illustrative quote                              |
| `search_service_centers`      | Return a virtual AUTONEX center, never real availability                                 |
| `demonstrate_service_request` | Return `simulated`, with `booking_created=false`; no persistence or external side effect |

Pydantic validates configuration inputs and MCP validates tool argument schemas. Unknown vehicle IDs and invented configuration options are rejected. Queries and service descriptions are bounded before use. Only allowlisted named tools are exposed; there is no arbitrary command, URL or file tool. Workflow telemetry records actual MCP invocations even when a call fails.

The HTTP test-drive endpoint is separate from agent tools. It requires validated contact fields, a future/today date and explicit consent. It stores a local interest record, not a booking. No agent can trigger a real purchase or account change.

## Authorized partner adapter extension

Implement the application `AgentTools` / repository interfaces in a new adapter. Configure credentials only on the backend. Validate scopes, tenant identity and input schemas before calling partner tools. Real bookings, purchases or customer account changes require verified partner authorization plus explicit user approval for the concrete action. Keep simulation and authorized adapters distinct and expose the connector mode in API/UI metadata.

This repository intentionally contains no invented BMW API endpoint, manufacturer credential flow, partnership claim or live booking tool.
