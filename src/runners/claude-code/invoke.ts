import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface InvokeOptions {
  cwd?: string;
  timeoutMs?: number;
}

export interface InvokeResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SubprocessInvoker {
  invoke(args: string[], options?: InvokeOptions): Promise<InvokeResult>;
}

export class ChildProcessInvoker implements SubprocessInvoker {
  async invoke(args: string[], options?: InvokeOptions): Promise<InvokeResult> {
    try {
      const { stdout, stderr } = await execFileAsync("claude", args, {
        cwd: options?.cwd,
        timeout: options?.timeoutMs ?? 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0 };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      const exitCode = typeof e.code === "number" ? e.code : 1;
      return {
        stdout: e.stdout ?? "",
        stderr: e.stderr ?? e.message ?? String(err),
        exitCode,
      };
    }
  }
}
