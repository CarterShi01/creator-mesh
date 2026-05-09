export interface AgentInput {
  agentRole: string;
  task: string;
  context?: Record<string, unknown>;
}

export interface AgentOutput {
  agentRole: string;
  result: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgentRole {
  agentId: string;
  execute(input: AgentInput): Promise<AgentOutput>;
}
