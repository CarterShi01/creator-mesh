import { randomUUID } from "node:crypto";
import type { RunnerPort, RunnerRegistry, RunnerAction, RunnerResult } from "../port.js";
import { ClaudeCodeRunnerRegistry } from "./registry.js";
import { ChildProcessInvoker, type SubprocessInvoker } from "./invoke.js";
import { classifyInvokeError } from "./errors.js";

export class ClaudeCodeRunnerAdapter implements RunnerPort {
  readonly runnerId = "claude-code";

  private readonly _registry: ClaudeCodeRunnerRegistry;
  private readonly _invoker: SubprocessInvoker;

  constructor(invoker?: SubprocessInvoker) {
    this._registry = new ClaudeCodeRunnerRegistry();
    this._invoker = invoker ?? new ChildProcessInvoker();
  }

  registry(): RunnerRegistry {
    return this._registry;
  }

  async execute(action: RunnerAction): Promise<RunnerResult> {
    const runId = randomUUID();
    const auditId = randomUUID();
    const startedAt = new Date();

    if (!this._registry.supports(action.taskType)) {
      return {
        runnerId: this.runnerId,
        action,
        runId,
        status: "failure",
        error: `Unsupported task type: ${action.taskType}`,
        startedAt,
        completedAt: new Date(),
        auditId,
      };
    }

    const args = this._buildArgs(action);

    try {
      const result = await this._invoker.invoke(args, {
        cwd: action.context?.workingDirectory,
      });

      const completedAt = new Date();

      if (result.exitCode !== 0) {
        return {
          runnerId: this.runnerId,
          action,
          runId,
          status: "failure",
          stdout: result.stdout,
          error: result.stderr || `Claude Code exited with code ${result.exitCode}`,
          startedAt,
          completedAt,
          auditId,
        };
      }

      return {
        runnerId: this.runnerId,
        action,
        runId,
        status: "success",
        output: result.stdout,
        stdout: result.stdout,
        startedAt,
        completedAt,
        auditId,
      };
    } catch (err) {
      const errorCode = classifyInvokeError(err);
      return {
        runnerId: this.runnerId,
        action,
        runId,
        status: "failure",
        error: errorCode,
        startedAt,
        completedAt: new Date(),
        auditId,
      };
    }
  }

  private _buildArgs(action: RunnerAction): string[] {
    const args: string[] = ["--print", action.taskDescription];

    if (action.context?.files?.length) {
      for (const f of action.context.files) {
        args.push("--file", f);
      }
    }

    return args;
  }
}
