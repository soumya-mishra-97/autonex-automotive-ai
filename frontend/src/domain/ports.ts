import type {
  AgentRun,
  Configuration,
  Health,
  KnowledgeDocument,
  OperationsData,
  Quote,
  RunRequest,
  TestDriveReceipt,
  TestDriveRequest,
  TraceStep,
  Vehicle,
} from "./models";

export interface VehicleRepository {
  list(): Promise<Vehicle[]>;
  quote(configuration: Configuration): Promise<Quote>;
  requestTestDrive(request: TestDriveRequest): Promise<TestDriveReceipt>;
}
export interface AgentRepository {
  health(): Promise<Health>;
  run(request: RunRequest, onStep?: (step: TraceStep) => void): Promise<AgentRun>;
  documents(): Promise<KnowledgeDocument[]>;
  recentRuns?(): Promise<AgentRun[]>;
  downloadReport(run: AgentRun): Promise<void>;
  operations(signal?: AbortSignal): Promise<OperationsData>;
}

export interface ServiceRepository {
  centers(query: string): Promise<import("./models").ServiceCenters>;
  simulate(vehicleId: string, service: string): Promise<import("./models").ServiceReceipt>;
}
