import type {
  ActionStatus,
  ApprovalRequirement,
  ApprovalResult,
  CapabilityType,
  PermissionLevel,
  ResultStatus,
} from "./types.js";

export interface Capability {
  id: string;
  type: CapabilityType;
  resourceType: string;
  permissionLevel: PermissionLevel;
  approvalRequirement: ApprovalRequirement;
  reversible: boolean;
  description: string;
}

export interface CapabilityRegistry {
  connectorId: string;
  capabilities: Capability[];
  supports(type: CapabilityType, resourceType?: string): boolean;
  get(type: CapabilityType, resourceType?: string): Capability | undefined;
}

export interface ConnectorConfig {
  connectorId: string;
  [key: string]: unknown;
}

export interface ConnectorAction {
  connectorId: string;
  capability: Capability;
  resourceType: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  payloadSummary?: string;
  requestedAt: Date;
  approvalResult?: ApprovalResult;
  status: ActionStatus;
}

export interface ConnectorResult {
  connectorId: string;
  action: ConnectorAction;
  status: ResultStatus;
  data?: unknown;
  error?: string;
  completedAt: Date;
  auditId: string;
}

export interface ConnectorPort {
  connectorId: string;
  capabilities(): CapabilityRegistry;
  execute(action: ConnectorAction): Promise<ConnectorResult>;
}
