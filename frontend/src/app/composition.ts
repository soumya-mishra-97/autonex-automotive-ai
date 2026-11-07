import { createShowroomStore } from "../application/showroom";
import { createWorkspaceRepositories } from "../infrastructure/workspace";

function deviceStorage(): Storage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}
const repositories = createWorkspaceRepositories({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  mode: import.meta.env.VITE_WORKSPACE_MODE === "demo" ? "demo" : "auto",
  storage: deviceStorage(),
});
export const vehicleRepository = repositories.vehicles;
export const serviceRepository = repositories.service;
export const agentRepository = repositories.agent;
export const useShowroom = createShowroomStore(vehicleRepository, agentRepository);
