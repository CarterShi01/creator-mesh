export type {
  ActionStatus,
  ApprovalRequirement,
  ApprovalResult,
  CapabilityType,
  PermissionLevel,
  ResultStatus,
} from "./types.js";

export type {
  Capability,
  CapabilityRegistry,
  ConnectorAction,
  ConnectorConfig,
  ConnectorPort,
  ConnectorResult,
} from "./port.js";

export {
  GitHubConnectorAdapter,
  GitHubDispatchService,
  GitHubClient,
  GITHUB_CAPABILITIES,
  createGitHubConnector,
} from "./github/index.js";
export type {
  GitHubConnectorConfig,
  GitHubClientConfig,
  CreateGitHubConnectorOptions,
  DispatchTaskOptions,
  DispatchTaskResult,
  RunStatus,
  IssueData,
  PrData,
  WorkflowRunData,
} from "./github/index.js";
